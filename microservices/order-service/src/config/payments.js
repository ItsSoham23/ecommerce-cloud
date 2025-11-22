require('dotenv').config();

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || null;
const PAYMENT_API_PATH = process.env.PAYMENT_API_PATH || '/api/payments';

module.exports = { PAYMENT_SERVICE_URL, PAYMENT_API_PATH };
