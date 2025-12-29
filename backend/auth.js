const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('./db');

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'dev-secret' || JWT_SECRET.length < 16) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL ERROR: JWT_SECRET environment variable is missing, insecure, or too short in production!');
    process.exit(1);
  } else {
    JWT_SECRET = JWT_SECRET || 'dev-secret-agroinone-secure-local';
  }
}

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const hashed = bcrypt.hashSync(password, 8);
  
  const { data, error } = await supabase
    .from('users')
    .insert([{ name: name || '', email: email.trim().toLowerCase(), phone: phone || '', password: hashed }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return res.status(400).json({ error: 'Registration failed. Please check your details.' });
  }
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
