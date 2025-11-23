const axios = require('axios');

async function fetchProductName(productId) {
  const base = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8082';
  try {
    const res = await axios.get(`${base}/api/products/${productId}`, { timeout: 3000 });
    const p = res && res.data ? res.data : null;
    return (p && (p.name || p.productName)) || `product-${productId}`;
  } catch (e) {
    // If product service is unreachable or product missing, return a fallback
    return `product-${productId}`;
  }
}

async function fetchOrder(orderId) {
  const base = process.env.ORDER_SERVICE_URL || 'http://localhost:8084';
  try {
    const res = await axios.get(`${base}/api/orders/${orderId}`, { timeout: 3000 });
    return res && res.data ? res.data : null;
  } catch (e) {
    return null;
  }
}

async function sendNotification(payload, meta = {}) {
  // payload expected to contain at least orderId and userId
  const orderId = payload.orderId || (payload && payload.order && payload.order.orderId) || 'unknown';
  const userId = payload.userId || (payload && payload.order && payload.order.userId) || 'unknown';

  // Build item lines (name + qty). Try to enrich names by calling product-service.
  // If payload doesn't include items, try to fetch them from order-service
  if ((!payload || !Array.isArray(payload.items) || payload.items.length === 0) && payload && payload.orderId) {
    try {
      const order = await fetchOrder(payload.orderId);
      if (order && Array.isArray(order.items) && order.items.length > 0) payload.items = order.items;
    } catch (e) {
      // ignore
    }
  }

  let itemsText = '';
  if (payload && Array.isArray(payload.items) && payload.items.length > 0) {
    const lines = [];
    for (const it of payload.items) {
      const pid = it.productId || it.id || 'unknown';
      const qty = it.quantity || it.qty || 0;
      let name = it.name || it.productName || null;
      if (!name) {
        // attempt to fetch product name from product-service
        try {
          // do not block the whole send if a single fetch fails
          /* eslint-disable no-await-in-loop */
          name = await fetchProductName(pid);
          /* eslint-enable no-await-in-loop */
        } catch (e) {
          name = `product-${pid}`;
        }
      }
      lines.push(`- ${name} x${qty}`);
    }
    itemsText = lines.join('\n');
  }

  const bodyLines = [];
  bodyLines.push(`Your order ${orderId} has been confirmed.`);
  if (itemsText) {
    bodyLines.push('Items:');
    bodyLines.push(itemsText);
  }
  if (typeof payload.total !== 'undefined') bodyLines.push(`Total: ${payload.total}`);

  const message = {
    to: userId,
    subject: `Order ${orderId} confirmed`,
    body: bodyLines.join('\n\n'),
    payload,
    meta
  };

  // First, log to console (dev-friendly)
  console.log('Sending notification:', message);

  // If NOTIFICATION_WEBHOOK_URL is configured, POST the notification to it.
  const webhook = process.env.NOTIFICATION_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await axios.post(webhook, message, { timeout: 5000 });
      console.log('Webhook delivered', res.status);
    } catch (e) {
      console.error('Failed to deliver webhook', e && e.message ? e.message : e);
    }
  }

  return message;
}

module.exports = { sendNotification };
