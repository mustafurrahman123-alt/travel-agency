// ──────────────────────────────────────────────
// 1.  ENVIRONMENT & DEPENDENCIES
// ──────────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');      // optional – for chat
const jwt = require('jsonwebtoken');   // only if you use custom JWT

// ──────────────────────────────────────────────
// 2.  SUPABASE CLIENT
// ──────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
// Prefer SERVICE_ROLE_KEY for backend operations (bypasses RLS).
// If you want to enforce RLS, use ANON_KEY and set proper RLS policies.
const supabase = createClient(supabaseUrl, supabaseKey);

// ──────────────────────────────────────────────
// 3.  OPENAI (optional – remove if not needed)
// ──────────────────────────────────────────────
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ──────────────────────────────────────────────
// 4.  EXPRESS APP
// ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ──────────────────────────────────────────────
// 5.  CORS – allow Vercel frontend + local dev
// ──────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,          // e.g. https://my-app.vercel.app
  'http://localhost:3000',           // local Next.js dev
  'http://localhost:5173',           // local Vite dev
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,   // if you send cookies / authorization headers
}));

app.use(express.json());

// ──────────────────────────────────────────────
// 6.  AUTHENTICATION MIDDLEWARE (optional)
// ──────────────────────────────────────────────
/**
 * Verifies a Supabase JWT from the Authorization header.
 * Attaches `req.user` (the user object) if valid.
 */
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
// 7.  ROUTES
// ──────────────────────────────────────────────

// Health & welcome
app.get('/', (req, res) => {
  res.json({
    message: '🌍 Travel Agency API',
    endpoints: {
      health: '/health',
      test: '/api/test',
      flights: '/api/flights',
      bookings: '/api/bookings',
      chat: '/api/chat/:sessionId',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Travel Agency API is running 🚀' });
});

app.get('/api/test', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Flights – GET all
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

// Bookings – POST (protected example – requires auth)
app.post('/api/bookings', authenticate, async (req, res) => {
  const { flight_id, hotel_id, status } = req.body;
  const user_id = req.user.id; // Supabase user ID

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

// ──────────────────────────────────────────────
// 8.  CHAT ROUTES (optional – uses OpenAI)
// ──────────────────────────────────────────────

// Helper: store messages in Supabase (optional)
const storeMessage = async (sessionId, role, content) => {
  if (!process.env.SUPABASE_URL) return;
  try {
    await supabase.from('chat_history').insert([
      { session_id: sessionId, role, content, created_at: new Date().toISOString() },
    ]);
  } catch (err) {
    console.error('Failed to store message:', err);
  }
};

const getHistory = async (sessionId) => {
  if (!process.env.SUPABASE_URL) return [];
  const { data, error } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

// Streaming chat endpoint (Server‑Sent Events)
app.post('/api/chat/:sessionId/stream', async (req, res) => {
  if (!openai) {
    return res.status(501).json({ error: 'OpenAI not configured' });
  }

  const { sessionId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const history = await getHistory(sessionId);
    const messages = [
      { role: 'system', content: 'You are a helpful travel assistant.' },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    await storeMessage(sessionId, 'user', message);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await storeMessage(sessionId, 'assistant', fullResponse);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Non‑streaming chat (returns JSON)
app.post('/api/chat/:sessionId', async (req, res) => {
  if (!openai) {
    return res.status(501).json({ error: 'OpenAI not configured' });
  }

  const { sessionId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const history = await getHistory(sessionId);
    const messages = [
      { role: 'system', content: 'You are a helpful travel assistant.' },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    await storeMessage(sessionId, 'user', message);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
    });

    const reply = completion.choices[0].message.content;
    await storeMessage(sessionId, 'assistant', reply);
    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get chat history
app.get('/api/chat/:sessionId/history', async (req, res) => {
  try {
    const history = await getHistory(req.params.sessionId);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────────
// 9.  404 & ERROR HANDLING
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ──────────────────────────────────────────────
// 10. START SERVER
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Supabase connected: ${supabaseUrl}`);
});
