const express = require('express');
const dotenv = require('dotenv');
const createKafkaConsumer = require('./services/kafkaConsumer');
const notificationSender = require('./services/notificationSender');

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8090;

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'notification-service' }));

// quick manual send endpoint for testing
app.post('/send-test', async (req, res) => {
  try {
    const payload = req.body || { orderId: 'test-1', userId: 'test-user', items: [], total: 0 };
    await notificationSender.sendNotification(payload, { reason: 'manual' });
    res.json({ success: true });
  } catch (e) {
    console.error('send-test failed', e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Notification service listening on ${PORT}`);
  // start kafka consumer after http server is up
  try {
    const topic = process.env.NOTIFICATION_TOPIC || 'payment.succeeded';
    const consumer = createKafkaConsumer({
      clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
      topic
    });

    await consumer.start(async (message) => {
      try {
        // message.value is Buffer or string
        let payload = null;
        try { payload = JSON.parse(message.value.toString()); } catch (e) { payload = { raw: message.value.toString() }; }
        console.log('Received notification message', payload);
        await notificationSender.sendNotification(payload, { sourceTopic: topic });
      } catch (err) {
        console.error('Failed to process notification message', err && err.message ? err.message : err);
      }
    });
  } catch (e) {
    console.error('Kafka consumer failed to start', e && e.message ? e.message : e);
  }
});

module.exports = app;
