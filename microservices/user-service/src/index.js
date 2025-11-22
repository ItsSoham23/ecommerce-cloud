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
app.use(cors());
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
