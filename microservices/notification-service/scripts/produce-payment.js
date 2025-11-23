const { Kafka } = require('kafkajs');

(async () => {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const kafka = new Kafka({ clientId: 'produce-payment-script', brokers });
  const producer = kafka.producer();
  try {
    await producer.connect();
    const msg = {
      orderId: process.argv[2] || `ord-test-${Date.now()}`,
      userId: 'web-test',
      items: [{ productId: '6', quantity: 2 }],
      total: 39.98,
      timestamp: new Date().toISOString()
    };
    console.log('Sending payment.succeeded message', msg);
    await producer.send({ topic: 'payment.succeeded', messages: [{ value: JSON.stringify(msg) }] });
    console.log('Message sent');
  } catch (e) {
    console.error('Producer error', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    try { await producer.disconnect(); } catch (e) {}
  }
})();
