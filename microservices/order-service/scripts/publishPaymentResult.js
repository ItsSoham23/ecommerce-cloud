/*
  Usage: set KAFKA_BROKERS=kafka:9092 (or localhost:9092)
         node scripts/publishPaymentResult.js <orderId> [success|failed]

  Publishes a payment.succeeded or payment.failed event to Kafka for testing.
*/

const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'order-service-test-producer';

async function produce(topic, message) {
  const kafka = new Kafka({ clientId, brokers });
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
  await producer.disconnect();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node publishPaymentResult.js <orderId> [success|failed]');
    process.exit(1);
  }
  const orderId = args[0];
  const status = args[1] || 'success';

  if (status === 'success') {
    await produce('payment.succeeded', { orderId, paymentId: `pay-${Date.now()}` });
    console.log('Published payment.succeeded for', orderId);
  } else {
    await produce('payment.failed', { orderId, reason: 'simulated_failure' });
    console.log('Published payment.failed for', orderId);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
