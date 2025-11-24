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
    const { orderId, amount, userId } = req.body || {};
    // Normalize simulate to avoid frontend/string mismatches (case, boolean, etc.)
    let simulate = (req.body && req.body.simulate) || req.query && req.query.simulate;
    if (typeof simulate === 'boolean') simulate = simulate ? 'succeeded' : 'failed';
    if (typeof simulate === 'string') simulate = simulate.toLowerCase();

    // Log the incoming request body for debugging incorrect simulate values
    console.log('Payment API called with body:', JSON.stringify(req.body));
    // simulate: 'succeeded' or 'failed'
    const paymentId = `pay-${Date.now()}`;
    const axios = require('axios');
    const orderSvcUrl = process.env.ORDER_SERVICE_URL || 'http://order-service:8084';
    if (simulate === 'failed' || simulate === 'failure' || simulate === 'false') {
      // notify order-service of payment.failed via internal HTTP endpoint
      await axios.post(`${orderSvcUrl}/api/internal/payment-event`, { topic: 'payment.failed', message: { orderId, reason: 'simulated_failure' } }, { timeout: 5000 });
      return res.json({ success: false, paymentId: null, message: 'Simulated failure sent', receivedSimulate: simulate });
    }

    // default: succeed - notify order-service via internal endpoint
    await axios.post(`${orderSvcUrl}/api/internal/payment-event`, { topic: 'payment.succeeded', message: { orderId, paymentId } }, { timeout: 5000 });
    return res.json({ success: true, paymentId, receivedSimulate: simulate || 'succeeded' });
  } catch (e) {
    console.error('Payment API error:', e && e.message ? e.message : e);
    if (e.response) {
      console.error('Response status:', e.response.status);
      console.error('Response data:', JSON.stringify(e.response.data));
    }
    console.error('Full error:', e);
    return res.status(500).json({ success: false, message: 'Internal error', error: e && e.message ? e.message : 'Unknown error' });
  }
});

app.listen(PORT, async () => {
  log(`Payment Service running on port ${PORT}`);
  try {
    // Try to start the Kafka consumer but don't crash the HTTP server if Kafka is unavailable.
    startConsumer({ groupId: 'payment-service-group', topic: 'payment.requested', eachMessage: paymentProcessor.handleRequest })
      .then(() => log('Payment consumer started and listening for payment.requested'))
      .catch((e) => {
        console.error('Failed to start payment consumer (will continue without consumer):', e && e.message ? e.message : e);
      });
  } catch (e) {
    // Should not reach here because startConsumer is handled above, but log defensively.
    console.error('Unexpected error while attempting to start payment consumer', e);
  }
});
