const axios = require('axios');
const kafkaService = require('./kafkaService');
const OrderModel = require('../models/Order');
const inventoryService = require('./inventoryService');
const { log, error } = require('../utils/logger');

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:8083';
const cartClient = axios.create({ baseURL: CART_SERVICE_URL, timeout: 5000 });

async function handlePaymentMessage({ topic, message }) {
  try {
    // Fetch current order state first and act only if it's awaiting payment.
    const { orderId } = message;
    const order = await OrderModel.getOrder(orderId);
    if (!order) {
      log('Payment event received for unknown order', orderId);
      return;
    }

    // Only process payment events when order is still awaiting payment.
    if (order.status !== 'AWAITING_PAYMENT') {
      log('Ignoring payment event; order not awaiting payment', orderId, 'status=', order.status);
      return;
    }

    if (topic === 'payment.succeeded') {
      const { paymentId } = message;
      log('Payment succeeded for order', orderId);

      // Transition order to CONFIRMED and persist paymentId
      await OrderModel.updateOrder(orderId, { status: 'CONFIRMED', paymentId });

      // Remove ordered items from user's cart (best-effort) and commit inventory
      if (order && order.userId && Array.isArray(order.items)) {
        for (const it of order.items) {
          try {
            await cartClient.delete(`/api/cart/${order.userId}/items/${it.productId}`);
            log('Removed product from cart', it.productId, 'for user', order.userId);
          } catch (e) {
            error('Failed to remove item from cart', it.productId, e.message || e);
          }

          try {
            await inventoryService.commit(it.productId, it.quantity, orderId);
          } catch (e) {
            error('commit sale after payment succeeded', e);
          }
        }
      }
    } else if (topic === 'payment.failed') {
      const { reason } = message;
      log('Payment failed for order', orderId, reason);

      // Clear reservations for items and mark order failed
      if (order && order.items) {
        for (const it of order.items) {
          try { await inventoryService.clearReservation(it.productId, orderId); } catch (e) { error('clear reservation after payment failed', e); }
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
