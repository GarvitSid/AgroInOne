const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("FATAL: Supabase URL and Key are required in the .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

async function createOrder({ userId, items, address, phone, deliveryDetails }) {
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      user_id: userId,
      items: items, // Supabase natively handles JSON!
      address: address,
      phone: phone,
      delivery_details: deliveryDetails
    }])
    .select()
    .single();

  if (error) throw error;
  
  // Format for frontend
  return {
    id: data.id,
    userId: data.user_id,
    items: data.items,
    address: data.address,
    phone: data.phone,
    deliveryDetails: data.delivery_details,
    createdAt: data.created_at
  };
}

async function getOrdersByUser(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(row => ({
    id: row.id,
    userId: row.user_id,
    items: row.items,
    address: row.address,
    phone: row.phone,
    deliveryDetails: row.delivery_details,
    createdAt: row.created_at
  }));
}

// Supabase makes seeding incredibly easy using 'upsert' (Insert, or ignore if exists)
async function seedProducts(demoData) {
  const formatted = demoData.map(item => ({
    id: item.keys,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    image_url: item.img,
    category: item.catagories,
    price: item.price
  }));
  const { error } = await supabase.from('products').upsert(formatted, { onConflict: 'id' });
  if (error) console.error("Product seeding error:", error);
}

async function seedSchemes(schemesData) {
  const { data } = await supabase.from('schemes').select('id').limit(1);
  if (data && data.length > 0) return; // Already seeded

  const formatted = schemesData.map(item => ({
    scheme_name: item.Scheme_Name || '',
    description: item.Description || '',
    state: item.State || '',
    image_url: item.Image || '',
    links: item.Links || ''
  }));
  await supabase.from('schemes').insert(formatted);
}

async function seedHelpdesk(helpdeskData) {
  const { data } = await supabase.from('helpdesk').select('id').limit(1);
  if (data && data.length > 0) return; // Already seeded

  const formatted = helpdeskData.map(item => ({
    title: item.title || '',
    description: item.description || '',
    phone: item.contact?.phone || '',
    email: item.contact?.email || '',
    links: item.links || '',
    state: item.state || ''
  }));
  await supabase.from('helpdesk').insert(formatted);
}

module.exports = { supabase, createOrder, getOrdersByUser, seedProducts, seedSchemes, seedHelpdesk };
