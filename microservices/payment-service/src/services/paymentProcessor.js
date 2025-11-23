const { produce } = require('./kafkaService');
const { v4: uuidv4 } = require('uuid');
const { log, error } = require('../utils/logger');

const SUCCESS_RATE = parseFloat(process.env.PAYMENT_SUCCESS_RATE || '0.85');
const PROCESSING_MS = parseInt(process.env.PAYMENT_PROCESSING_MS || '800', 10);

async function handleRequest({ message }) {
  // message: { orderId, userId, items, total }
  try {
    log('Processing payment request', message.orderId || '<no-order>');

    // If PAYMENT_AUTO_PROCESS is explicitly set to 'false', skip automatic
    // processing so developers can use the HTTP simulate endpoints to drive
    // payment results deterministically during local testing.
    const auto = (process.env.PAYMENT_AUTO_PROCESS || 'true').toLowerCase();
    if (auto === 'false') {
      log(`Auto-processing disabled (PAYMENT_AUTO_PROCESS=false); skipping processing for order ${message.orderId}`);
      return;
    }

    // simulate processing delay
    await new Promise(r => setTimeout(r, PROCESSING_MS));

    const success = Math.random() < SUCCESS_RATE;
    if (success) {
      const paymentId = `pay-${Date.now()}`;
      await produce('payment.succeeded', { orderId: message.orderId, paymentId });
      log(`Payment succeeded for order ${message.orderId}`);
    } else {
      await produce('payment.failed', { orderId: message.orderId, reason: 'simulated_failure' });
      log(`Payment failed for order ${message.orderId}`);
    }
  } catch (e) {
    error('payment processing error', e && e.message ? e.message : e);
    try {
      await produce('payment.failed', { orderId: message.orderId, reason: 'processing_error' });
    } catch (err) {
      error('failed to publish payment.failed after error', err && err.message ? err.message : err);
    }
  }
}

module.exports = { handleRequest };
