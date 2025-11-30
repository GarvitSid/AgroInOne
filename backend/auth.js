const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('./db');

let JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET || JWT_SECRET === 'dev-secret') {
    console.error('FATAL ERROR: JWT_SECRET environment variable is missing or insecure in production!');
    process.exit(1); // Refuse to start with a weak secret
  }
} else {
  // Safe fallback for local development only
  JWT_SECRET = JWT_SECRET || 'dev-secret';
}

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const hashed = bcrypt.hashSync(password, 8);
  
  const { data, error } = await supabase
    .from('users')
    .insert([{ name: name || '', email, phone: phone || '', password: hashed }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  const user = { id: data.id, name, email };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user, token });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return res.status(401).json({ error: 'invalid credentials' });
  if (!bcrypt.compareSync(password, data.password)) return res.status(401).json({ error: 'invalid credentials' });

  const user = { id: data.id, name: data.name, email: data.email };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  res.json({ user, token });
});

router.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { router, authMiddleware };
