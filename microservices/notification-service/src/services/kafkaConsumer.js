const { Kafka } = require('kafkajs');

function createKafkaConsumer({ clientId, brokers, groupId, topic }) {
  const kafka = new Kafka({ clientId, brokers });
  const consumer = kafka.consumer({ groupId });

  return {
    start: async (onMessage) => {
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      console.log(`Kafka consumer connected. Subscribed to ${topic}`);

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            await onMessage(message);
          } catch (e) {
            console.error('Error in eachMessage handler', e);
          }
        }
      });
    },
    disconnect: async () => {
      try { await consumer.disconnect(); } catch (e) { console.warn('consumer disconnect failed', e); }
    }
  };
}

module.exports = createKafkaConsumer;
