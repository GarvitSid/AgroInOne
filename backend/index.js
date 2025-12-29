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
const { supabase, seedSchemes, seedHelpdesk } = require('./db');

// Seed tables from JSON snapshots (each seeder is a no-op if table already has rows)
const schemesData  = loadJsonArray('govt_schemes.json');
const helpdeskData = loadJsonArray('helpdesk_data.json');

async function bootDatabase(retries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Checking database seeds (attempt ${attempt}/${retries})...`);
      await seedSchemes(schemesData);
      await seedHelpdesk(helpdeskData);
      console.log("Database check complete!");
      return;
    } catch (err) {
      console.error(`Database seeding attempt ${attempt} failed:`, err.message || err);
      if (attempt < retries) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.warn("Database seeding could not complete; running with current state.");
      }
    }
  }
}

bootDatabase();

// auth routes
const { router: authRouter, authMiddleware } = require('./auth');
app.use('/api/auth', authRouter);



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
    const status = err.response ? err.response.status : 500;
    const data = err.response ? err.response.data : { error: 'prediction error', details: err.message };
    res.status(status).json(data);
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
    const status = err.response ? err.response.status : 500;
    const data = err.response ? err.response.data : { error: 'prediction error', details: err.message };
    res.status(status).json(data);
  }
});

// Example protected endpoint
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
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
