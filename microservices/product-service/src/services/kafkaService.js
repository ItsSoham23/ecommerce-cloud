const { Kafka } = require('kafkajs');
const { log, error } = require('../utils/logger');

const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'product-service';
const kafka = new Kafka({ clientId, brokers });

async function produce(topic, payload) {
  const producer = kafka.producer();
  try {
    await producer.connect();
    await producer.send({ topic, messages: [{ value: JSON.stringify(payload) }] });
    log(`Produced ${topic}: ${JSON.stringify(payload)}`);
  } catch (err) {
    error('Kafka produce error', err && err.message ? err.message : err);
    throw err;
  } finally {
    try { await producer.disconnect(); } catch (e) { /* ignore */ }
  }
}

module.exports = { produce };
