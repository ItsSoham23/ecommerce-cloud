const { Kafka } = require('kafkajs');
const { log, error } = require('../utils/logger');

const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
const kafka = new Kafka({ brokers });

async function startConsumer({ groupId, topic, eachMessage }) {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        await eachMessage({ topic, partition, message: payload });
      } catch (e) {
        error('consumer eachMessage error', e && e.message ? e.message : e);
      }
    }
  });
  log(`Kafka consumer connected to ${brokers.join(',')} group=${groupId} topic=${topic}`);
  return consumer;
}

async function produce(topic, payload) {
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic, messages: [{ value: JSON.stringify(payload) }] });
  await producer.disconnect();
  log(`Produced ${topic} ${JSON.stringify(payload)}`);
}

module.exports = { startConsumer, produce };
