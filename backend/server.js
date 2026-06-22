// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // or SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ------------------------------------------------------------
// Example: Test JWT route (remove later)
app.get('/test-jwt', (req, res) => {
  const token = jwt.sign({ test: 'ok' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// ------------------------------------------------------------
// Example: GET all records from a Supabase table (e.g., "flights")
// Replace "flights" with your actual table name
app.get('/api/flights', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flights')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// Example: POST to insert a new booking
app.post('/api/bookings', async (req, res) => {
  const { user_id, flight_id, hotel_id, status } = req.body;
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

// ------------------------------------------------------------
// Health check (for Render)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Travel Agency API is running 🚀' });
});

// ------------------------------------------------------------
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Connected to Supabase project: ${supabaseUrl}`);
});
