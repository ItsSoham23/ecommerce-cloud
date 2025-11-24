const { Kafka } = require('kafkajs');
const { log, error } = require('../utils/logger');

// Allow disabling Kafka in environments where Kafka is not available
// (e.g., simple local/cluster demos). When `USE_KAFKA` !== 'true' we
// export no-op functions so services can continue to operate without
// a running Kafka broker.
const USE_KAFKA = (process.env.USE_KAFKA || 'false').toLowerCase() === 'true';

if (!USE_KAFKA) {
  log('Kafka disabled (USE_KAFKA != true). Kafka producers/consumers are no-ops.');
  module.exports = {
    startConsumer: async () => {
      log('startConsumer skipped because Kafka is disabled');
    },
    produce: async (topic, payload) => {
      log('produce skipped because Kafka is disabled', { topic, payload });
    }
  };
} else {
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
}
