const axios = require('axios');
const kafkaService = require('./kafkaService');
const OrderModel = require('../models/Order');
const inventoryService = require('./inventoryService');
const { log, error } = require('../utils/logger');

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:8083';
const cartClient = axios.create({ baseURL: CART_SERVICE_URL, timeout: 5000 });

async function handlePaymentMessage({ topic, message }) {
  try {
    if (topic === 'payment.succeeded') {
      const { orderId, paymentId } = message;
      log('Payment succeeded for order', orderId);

      // Fetch order to get userId and items
      const order = await OrderModel.getOrder(orderId);
      // Update order status and paymentId
      await OrderModel.updateOrder(orderId, { status: 'CONFIRMED', paymentId });

      // Remove ordered items from user's cart (best-effort)
      if (order && order.userId && Array.isArray(order.items)) {
        for (const it of order.items) {
          try {
            // Cart API: DELETE /api/cart/:userId/items/:productId
            await cartClient.delete(`/api/cart/${order.userId}/items/${it.productId}`);
            log('Removed product from cart', it.productId, 'for user', order.userId);
          } catch (e) {
            // Non-fatal — log and continue
            error('Failed to remove item from cart', it.productId, e.message || e);
          }
        }
      }
    } else if (topic === 'payment.failed') {
      const { orderId, reason } = message;
      log('Payment failed for order', orderId, reason);
      const order = await OrderModel.getOrder(orderId);
      if (order && order.items) {
        for (const it of order.items) {
          try { await inventoryService.release(it.productId, it.quantity); } catch (e) { error('release after payment failed', e); }
        }
      }
      await OrderModel.updateOrder(orderId, { status: 'FAILED', failureReason: reason || 'payment_failed' });
    }
  } catch (err) {
    error('Error processing payment message', err);
  }
}

async function startPaymentConsumer() {
  await kafkaService.subscribe(['payment.succeeded', 'payment.failed'], async ({ topic, message }) => {
    await handlePaymentMessage({ topic, message });
  });
}

module.exports = { startPaymentConsumer, handlePaymentMessage };
