require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend build files
const FRONTEND_BUILD_PATH = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(FRONTEND_BUILD_PATH));

const DATA_PATH = path.join(__dirname, 'data');

function loadJson(filename) {
  try {
    const full = path.join(DATA_PATH, filename);
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    console.error('Failed to load', filename, e.message);
    return {};
  }
}

function loadJsonArray(filename) {
  const data = loadJson(filename);
  return Array.isArray(data) ? data : [];
}

// Remove init() since we don't need it anymore
const { supabase, seedProducts, seedSchemes, seedHelpdesk, createOrder, getOrdersByUser } = require('./db');

// Seed all tables from JSON snapshots (each seeder is a no-op if table already has rows)
const productsData = loadJsonArray('products.json');
const schemesData  = loadJsonArray('govt_schemes.json');
const helpdeskData = loadJsonArray('helpdesk_data.json');

async function bootDatabase() {
  try {
    console.log("Checking database seeds...");
    await seedProducts(productsData);
    await seedSchemes(schemesData);
    await seedHelpdesk(helpdeskData);
    console.log("Database check complete!");
  } catch (err) {
    console.error("Database seeding timeout/error:", err);
  }
}

bootDatabase();

// auth routes
const { router: authRouter, authMiddleware } = require('./auth');
app.use('/api/auth', authRouter);

// Fetch all products
app.get('/api/products', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*');
  if (error) return res.status(500).json({ error: 'Failed to fetch products' });
  
  const formattedRows = data.map((row) => ({
    keys: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    img: row.image_url,
    catagories: row.category,
    price: row.price,
  }));
  res.json(formattedRows);
});

// Fetch a single product by ID
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
  
  if (error || !data) return res.status(404).json({ error: 'Product not found' });
  
  res.json({
    keys: data.id,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    img: data.image_url,
    catagories: data.category,
    price: data.price,
  });
});

app.get('/api/schemes', async (req, res) => {
  const state = (req.query.state || '').toString().trim().toLowerCase();
  
  let query = supabase.from('schemes').select('*');
  
  if (state && state !== 'all india') {
    // ILIKE makes it case-insensitive
    query = query.or(`state.ilike.${state},state.ilike.all india`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Database error' });

  const formatted = data.map((r) => ({
    Scheme_Name: r.scheme_name,
    Description: r.description,
    State: r.state,
    Image: r.image_url,
    Links: r.links,
  }));
  res.json(formatted);
});

app.get('/api/helpdesk', async (req, res) => {
  const { data, error } = await supabase.from('helpdesk').select('*');
  if (error) return res.status(500).json({ error: 'Database error' });

  const formatted = data.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    contact: { phone: r.phone, email: r.email },
    links: r.links,
    state: r.state,
  }));
  res.json(formatted);
});

app.get('/api/predict/options', (req, res) => {
  res.json({
    state: loadJson('state.json'),
    district: loadJson('district.json'),
    crop: loadJson('crop.json'),
    season: loadJson('season.json'),
  });
});

// Proxy prediction requests to the ML Flask server
const ML_SERVER = process.env.ML_SERVER_URL || 'http://localhost:5001';

app.post('/api/predict/crop', async (req, res) => {
  try {
    const resp = await axios.post(`${ML_SERVER}/predict/crop`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(resp.data);
  } catch (err) {
    console.error('Error proxying crop predict:', err.message);
    res.status(500).json({ error: 'prediction error', details: err.message });
  }
});

app.post('/api/predict/loan', async (req, res) => {
  try {
    const resp = await axios.post(`${ML_SERVER}/predict/loan`, req.body, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(resp.data);
  } catch (err) {
    console.error('Error proxying loan predict:', err.message);
    res.status(500).json({ error: 'prediction error', details: err.message });
  }
});

// Example protected endpoint
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { items, address, phone, deliveryDetails } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items are required' });
    }
    if (!address || !phone || !deliveryDetails) {
      return res.status(400).json({ error: 'address, phone and deliveryDetails are required' });
    }

    // 1. Extract only IDs and quantities from the client — never trust client-sent prices
    const requestedItems = items.map((item) => ({ id: item.keys, quantity: Number(item.quantity) || 1 }));
    const productIds     = requestedItems.map((item) => item.id);

    // 2. Look up the REAL prices from the database
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, title, price')
      .in('id', productIds);

    if (error) return res.status(500).json({ error: 'Database error while verifying items' });

    // 3. Rebuild the order using verified DB data — client prices are ignored
    let secureTotal = 0;
    const secureItems = [];
    for (const reqItem of requestedItems) {
      const real = dbProducts.find((p) => p.id === reqItem.id);
      if (real) {
        secureTotal += real.price * reqItem.quantity;
        secureItems.push({
          keys:      real.id,
          title:     real.title,
          price:     real.price,       // guaranteed server-side price
          quantity:  reqItem.quantity,
          itemTotal: real.price * reqItem.quantity,
        });
      }
    }

    if (secureItems.length === 0) {
      return res.status(400).json({ error: 'None of the requested products were found' });
    }

    // 4. Persist the tamper-proof order
    const order = await createOrder({
      userId: req.user.id,
      items:  secureItems,
      address,
      phone,
      deliveryDetails,
    });

    res.status(201).json({ ...order, total: secureTotal });
  } catch (err) {
    console.error('Failed to create order:', err.message);
    res.status(500).json({ error: 'failed to create order', details: err.message });
  }
});

app.get('/api/orders/my', authMiddleware, async (req, res) => {
  try {
    const orders = await getOrdersByUser(req.user.id);
    res.json(orders);
  } catch (err) {
    console.error('Failed to fetch orders:', err.message);
    res.status(500).json({ error: 'failed to fetch orders', details: err.message });
  }
});

// Health check endpoints
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'backend' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'backend' }));

// SPA Fallback - Serve index.html for all non-API routes (React Router takes over)
app.get('*', (req, res) => {
  const indexPath = path.join(FRONTEND_BUILD_PATH, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend build files not found' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
