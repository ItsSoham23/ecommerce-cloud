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

app.use(helmet());
// Enable CORS. Allowed origins can be configured via ALLOWED_ORIGINS env var
// as a comma-separated list (e.g. "https://app.example.com,https://www.example.com").
// If not set, fall back to common localhost dev origins.
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000';
const allowedOrigins = allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, mobile clients)
    if (!origin) return callback(null, true);
    // Allow wildcard '*' if provided
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Log denied origin for easier debugging
    console.warn('CORS: denied origin', origin, 'allowed=', allowedOrigins);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
