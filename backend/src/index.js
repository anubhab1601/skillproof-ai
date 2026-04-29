/**
 * SkillProof Backend Server — Entry Point
 * Replaces Cloud Functions on Firebase Spark plan
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { startCronJobs } = require('./cron/jobs');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow any origin dynamically to prevent CORS preflight 500 errors
    callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Role'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));

// ─── RATE LIMITERS (Phase 8) ──────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many signup attempts. Try again in 1 hour.' },
});

const joinTaskLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20,
  keyGenerator: (req) => req.user?.uid || req.ip,
  message: { error: 'Too many task join attempts. Max 20 per day.' },
});

const submissionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.user?.uid}-${req.body?.taskId}`,
  message: { error: 'Submission limit reached for this task.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  keyGenerator: (req) => req.user?.uid || req.ip,
  message: { error: 'Upload rate limit exceeded. Try again in 1 hour.' },
});

// ─── HEALTH CHECK (for Render.com keep-alive ping) ────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'skillproof-backend',
  });
});

// ─── ROUTES ───────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const submissionRoutes = require('./routes/submissions');
const paymentRoutes = require('./routes/payments');
const offerRoutes = require('./routes/offers');
const cloudinaryRoutes = require('./routes/cloudinary');

// Auth routes
app.use('/api/auth', authRoutes);
app.post('/api/auth/create-profile', authLimiter); // rate limit on create-profile

// Task routes
app.use('/api/tasks', taskRoutes);

// Submission routes
app.use('/api/submissions', submissionRoutes);
// Payout release route (lives under submissions but uses /api/tasks/:id path)
app.post('/api/tasks/:id/release-payouts', submissionRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', paymentRoutes);

// Offer routes
app.use('/api/offers', offerRoutes);

// Cloudinary routes
app.use('/api/cloudinary', cloudinaryRoutes);

// ─── AI TEST ENDPOINT (dev only) ──────────────────────────────
app.get('/api/ai/test', async (req, res) => {
  try {
    const axios = require('axios');
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.AI_MODEL || 'google/gemma-3-27b-it:free';

    if (!apiKey) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });
    }

    console.log(`[AI Test] Sending test request to OpenRouter with model: ${model}`);

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model,
      messages: [
        { role: 'user', content: 'Reply with exactly: {"status":"ok","model":"' + model + '"}' }
      ],
      max_tokens: 50,
      temperature: 0,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://skillproof.ai',
        'X-Title': 'SkillProof AI Test',
      },
      timeout: 30000,
    });

    const content = response.data?.choices?.[0]?.message?.content || 'no content';
    console.log(`[AI Test] ✓ Response: ${content}`);

    return res.json({
      status: 'ok',
      model: response.data?.model || model,
      content,
      provider: response.data?.provider || 'unknown',
    });
  } catch (err) {
    console.error('[AI Test] ✗ Failed:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'AI test failed',
      details: err.response?.data || err.message,
      status: err.response?.status || 'network_error',
    });
  }
});

// ─── 404 HANDLER ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── START SERVER ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 SkillProof Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Start cron jobs
  startCronJobs();
});
