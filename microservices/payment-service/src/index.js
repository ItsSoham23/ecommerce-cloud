const express = require('express');
const { startConsumer, produce } = require('./services/kafkaService');
const paymentProcessor = require('./services/paymentProcessor');
const { log } = require('./utils/logger');

const PORT = process.env.PORT || 8085;

const app = express();

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'payment-service', timestamp: new Date().toISOString() }));

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
