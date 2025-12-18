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

module.exports = { supabase, seedSchemes, seedHelpdesk };

