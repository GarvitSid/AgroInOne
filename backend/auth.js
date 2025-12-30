const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error('FATAL: JWT_SECRET environment variable is missing, undefined, or shorter than 16 characters.');
  process.exit(1);
}

// RFC 5322 compliant email regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  // 1. Mandatory fields presence check
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 2. Email format validation
  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // 3. Password complexity enforcement (min 8 chars, at least one number or special char)
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  if (!/(?=.*[0-9])|(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least one number or special character' });
  }

  // 4. Phone number sanitization (optional, but if provided, validate 10 digits)
  let cleanPhone = '';
  if (phone) {
    cleanPhone = phone.toString().trim().replace(/[\s-]/g, '');
    if (!/^\+?[0-9]{10,13}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }
  }

  // 5. Asynchronous bcrypt hashing (salt rounds: 10)
  try {
    const hashed = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: (name || '').trim(),
        email: normalizedEmail,
        phone: cleanPhone,
        password: hashed
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(400).json({ error: 'Registration failed. Please check your details.' });
    }

    const user = { id: data.id, name: data.name, email: data.email, phone: data.phone };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Registration hashing or insertion error:', err.message);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, name, email, phone, password')
      .eq('email', normalizedEmail)
      .single();

    if (error || !userRecord) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Asynchronous bcrypt comparison (constant time)
    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      phone: userRecord.phone
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    console.error('Login authentication error:', err.message);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Authenticated user profile retrieval (fresh from database)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('id', req.user.id)
      .single();

    if (error || !userRecord) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({ user: userRecord });
  } catch (err) {
    console.error('Profile retrieval error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Invalid token format. Expected "Bearer <token>"' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Your session has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
        expiredAt: err.expiredAt
      });
    }
    return res.status(401).json({
      error: 'Invalid or corrupted authentication token',
      code: 'INVALID_TOKEN'
    });
  }
}

module.exports = { router, authMiddleware };
