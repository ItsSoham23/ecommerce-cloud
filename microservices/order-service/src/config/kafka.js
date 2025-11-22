require('dotenv').config();

// Comma-separated list of brokers, e.g. "localhost:9092"
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'order-service-client';

module.exports = { KAFKA_BROKERS, KAFKA_CLIENT_ID };
