const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { sequelize } = require('./config/database');
const productRoutes = require('./routes/productRoutes');
const { register, collectDefaultMetrics } = require('prom-client');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8082;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prometheus metrics
collectDefaultMetrics();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'product-service',
    timestamp: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API Routes
app.use('/api/products', productRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Product Service running on port ${PORT}`);
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;