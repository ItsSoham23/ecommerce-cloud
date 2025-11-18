const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const CartModel = require('./models/Cart');
const cartRoutes = require('./routes/cartRoutes');
const { register, metricsMiddleware, client } = require('./middleware/metrics');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8083;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

// Collect default metrics ONCE - with prefix
client.collectDefaultMetrics({ 
    prefix: 'cart_service_',
    register: register 
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'cart-service',
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.status(200).json({ 
    status: 'READY',
    service: 'cart-service'
  });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// API Routes
app.use('/api/cart', cartRoutes);

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

// Initialize DynamoDB table and start server
const startServer = async () => {
  try {
    // Wait for LocalStack to be ready
    console.log('⏳ Waiting for LocalStack to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await CartModel.createTable();
    console.log('✅ DynamoDB table initialized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Cart Service running on port ${PORT}`);
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