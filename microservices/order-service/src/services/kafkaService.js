const { Kafka } = require('kafkajs');
const { KAFKA_BROKERS, KAFKA_CLIENT_ID } = require('../config/kafka');
const { log, error } = require('../utils/logger');

let kafka, producer, consumer;

async function initKafka() {
  kafka = new Kafka({ clientId: KAFKA_CLIENT_ID, brokers: KAFKA_BROKERS });
  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: `${KAFKA_CLIENT_ID}-group` });

  await producer.connect();
  await consumer.connect();
  log('Kafka connected', KAFKA_BROKERS);
}

async function produce(topic, message) {
  if (!producer) throw new Error('Kafka producer not initialized');
  const payload = { value: JSON.stringify(message) };
  try {
    await producer.send({ topic, messages: [payload] });
  } catch (err) {
    error('Kafka produce error', err);
    throw err;
  }
}

async function subscribe(topics, eachMessage) {
  if (!consumer) throw new Error('Kafka consumer not initialized');
  for (const t of topics) {
    await consumer.subscribe({ topic: t, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        await eachMessage({ topic, partition, message: payload });
      } catch (err) {
        error('Error handling Kafka message', err);
      }
    }
  });
}

module.exports = { initKafka, produce, subscribe };
