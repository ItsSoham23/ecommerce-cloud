const express = require('express');
const { startConsumer, produce } = require('./services/kafkaService');
const paymentProcessor = require('./services/paymentProcessor');
const { log } = require('./utils/logger');

const PORT = process.env.PORT || 8085;

const app = express();
const cors = require('cors');

// Allow browser requests during local development
app.use(cors({ origin: true }));
app.get('/health', (req, res) => res.json({ status: 'UP', service: 'payment-service', timestamp: new Date().toISOString() }));

app.use(express.json());

// Test payment endpoint to allow UI-driven simulation of payment results.
app.post('/api/payments', async (req, res) => {
  try {
    const { orderId, amount, userId, simulate } = req.body || {};
    // simulate: 'succeeded' or 'failed'
    const paymentId = `pay-${Date.now()}`;
    if (simulate === 'failed') {
      // publish payment.failed
      const { produce } = require('./services/kafkaService');
      await produce('payment.failed', { orderId, reason: 'simulated_failure' });
      return res.json({ success: false, paymentId: null, message: 'Simulated failure published' });
    }

    // default: succeed
    const { produce } = require('./services/kafkaService');
    await produce('payment.succeeded', { orderId, paymentId });
    return res.json({ success: true, paymentId });
  } catch (e) {
    console.error('Payment API error', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
});

app.listen(PORT, async () => {
  log(`Payment Service running on port ${PORT}`);
  try {
    // start the kafka consumer and wire processor
    await startConsumer({ groupId: 'payment-service-group', topic: 'payment.requested', eachMessage: paymentProcessor.handleRequest });
    log('Payment consumer started and listening for payment.requested');
  } catch (e) {
    console.error('Failed to start payment consumer', e);
    process.exit(1);
  }
});
