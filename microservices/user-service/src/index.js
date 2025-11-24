const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const sequelize = require('./config/database');
const User = require('./models/user');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const attemptSimpleObjectRepair = (raw = '') => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  const inner = trimmed.slice(1, -1);
  if (!inner) return {};
  const obj = {};
  const parts = inner.split(',');
  for (const fragment of parts) {
    const idx = fragment.indexOf(':');
    if (idx === -1) return null;
    const key = fragment.slice(0, idx).trim().replace(/^"|"$/g, '');
    let value = fragment.slice(idx + 1).trim();
    if (!key) return null;
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    obj[key] = value;
  }
  return obj;
};

app.use(helmet());
// Enable CORS for the SPA and allow configurable origins via env.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, mobile clients)
    if (!origin) return callback(null, true);

    // If no explicit allow-list, accept all origins (used in AWS until ingress restricts it)
    if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: This origin is not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Capture raw request body for debugging (keeps parsing intact via body-parser)
// Robust body parser: read raw bytes, try JSON.parse; if it fails try to repair
// common issue where incoming JSON has unquoted object keys (e.g. {a:1}) and
// convert them to valid JSON by quoting keys. This is a temporary, defensive
// workaround to accept malformed clients while we root-cause the upstream
// component that strips double-quotes.
app.use((req, res, next) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (!ct.includes('application/json') && !ct.includes('application/x-www-form-urlencoded')) {
    return next();
  }

  let raw = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    req.rawBody = raw;
    try {
      console.log('incoming body — Content-Type:', ct);
      const truncated = raw && raw.length > 1000 ? raw.slice(0, 1000) + '...[truncated]' : raw;
      console.log('incoming raw body (truncated):', truncated);

      // Try normal JSON parse first
      if (ct.includes('application/json')) {
        try {
          req.body = raw.length ? JSON.parse(raw) : {};
          return next();
        } catch (err) {
          // Attempt to repair unquoted keys: replace {key: with {"key":
          const repaired = raw.replace(/([\{,]\s*)([^\s\"\':]+)\s*:/g, '$1"$2":');
          try {
            req.body = repaired.length ? JSON.parse(repaired) : {};
            req.rawBody = repaired;
            console.log('Repaired JSON body applied');
            return next();
          } catch (err2) {
            const simple = attemptSimpleObjectRepair(raw);
            if (simple) {
              req.body = simple;
              req.rawBody = JSON.stringify(simple);
              console.log('Applied simple object repair');
              return next();
            }
            console.error('Repair attempt failed, falling through to default parser');
            // fall through to next()
          }
        }
      }

      // For urlencoded, parse via URLSearchParams
      if (ct.includes('application/x-www-form-urlencoded')) {
        try {
          req.body = Object.fromEntries(new URLSearchParams(raw));
          return next();
        } catch (e) {
          console.error('Failed to parse urlencoded body', e && e.stack ? e.stack : e);
        }
      }
    } catch (e) {
      console.error('body read/parse middleware error:', e && e.stack ? e.stack : e);
    }

    // Let downstream handle the error (body-parser will run if needed)
    return next();
  });
});

app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'user-service' }));

app.use('/api/users', userRoutes);

// error handler
app.use((err, req, res, next) => {
  console.error(err.stack || err);
  const status = err.status || 500;
  // Normalize error response to { message, errors? }
  const payload = { message: err.message || 'Internal Server Error' };
  if (err.errors) payload.errors = err.errors;
  res.status(status).json(payload);
});

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync();
    console.log('✅ Models synced');

    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server', err);
    process.exit(1);
  }
};

start();

module.exports = app;
