// ──────────────────────────────────────────────
// 1.  ENVIRONMENT & DEPENDENCIES
// ──────────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');   // only if you need custom JWT

// ──────────────────────────────────────────────
// 2.  SUPABASE CLIENT
// ──────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ──────────────────────────────────────────────
// 3.  EXPRESS APP
// ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────────
// 4.  CORS – allow Vercel + local dev
// ──────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ──────────────────────────────────────────────
// 5.  AUTHENTICATION MIDDLEWARE (optional)
// ──────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ──────────────────────────────────────────────
// 6.  ROUTES
// ──────────────────────────────────────────────

// Welcome & health
app.get('/', (req, res) => {
  res.json({
    message: '🌍 Travel Agency API',
    endpoints: {
      health: '/health',
      test: '/api/test',
      flights: '/api/flights',
      bookings: '/api/bookings',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Travel Agency API is running 🚀' });
});

app.get('/api/test', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Test JWT (optional)
app.get('/test-jwt', (req, res) => {
  const token = jwt.sign({ test: 'ok' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// GET all flights
app.get('/api/flights', async (req, res) => {
  try {
    const { data, error } = await supabase.from('flights').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST a new booking (protected – requires auth)
app.post('/api/bookings', authenticate, async (req, res) => {
  const { flight_id, hotel_id, status } = req.body;
  const user_id = req.user.id;

  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([{ user_id, flight_id, hotel_id, status }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// (Add more endpoints for hotels, payments, etc. as needed)

// ──────────────────────────────────────────────
// 7.  404 & ERROR HANDLING
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ──────────────────────────────────────────────
// 8.  START SERVER
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Supabase connected: ${supabaseUrl}`);
});
