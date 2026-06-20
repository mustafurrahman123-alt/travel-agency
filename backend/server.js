const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./database/connection');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use';

// Middleware
app.use(cors());
app.use(express.json());

// ------------------- ADMIN AUTH -------------------
// Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query Supabase for admin user by username
    const { data: user, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password (hash stored in DB)
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ------------------- PROTECTED ROUTES -------------------
// Get dashboard stats
app.get('/api/admin/stats', verifyToken, async (req, res) => {
  try {
    // Example: count users, orders, revenue from Supabase
    const { count: totalUsers, error: userErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: activeOrders, error: orderErr } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Revenue – sum of order totals (example)
    const { data: revenueData, error: revErr } = await supabase
      .from('orders')
      .select('total');

    let totalRevenue = 0;
    if (revenueData) {
      totalRevenue = revenueData.reduce((sum, order) => sum + order.total, 0);
    }

    res.json({
      totalUsers: totalUsers || 0,
      activeOrders: activeOrders || 0,
      revenue: totalRevenue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get recent users
app.get('/api/admin/users', verifyToken, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(users || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Logout (optional – just invalidate client-side)
app.post('/api/admin/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logged out' });
});

// ------------------- TEST ROUTE -------------------
app.get('/api/test', (req, res) => {
  res.json({ message: 'API test route works!' });
});

// ------------------- START SERVER -------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Bound to 0.0.0.0:${PORT}`);
  console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
  console.log('✅ Ready to accept connections');
});
