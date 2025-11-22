const { createClient } = require('../utils/httpClient');
const { v4: uuidv4 } = require('uuid');
const { log, error } = require('../utils/logger');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || null;
const client = PAYMENT_SERVICE_URL ? createClient(PAYMENT_SERVICE_URL, 10000) : null;

async function processPayment(order, timeoutMs = 10000) {
	// If a remote payment service is configured, call it; otherwise simulate.
	if (!client) {
		// Simulate network latency and random success for local development
		log('No PAYMENT_SERVICE_URL configured — simulating payment');
		await new Promise((r) => setTimeout(r, Math.min(timeoutMs, 500)));
		return { success: true, paymentId: `sim-${uuidv4()}` };
	}

	const paymentPromise = client.post('/api/payments', {
		amount: order.total,
		userId: order.userId,
		orderId: order.orderId,
		items: order.items
	});

	try {
		const res = await Promise.race([
			paymentPromise,
			new Promise((_, rej) => setTimeout(() => rej(new Error('Payment timeout')), timeoutMs))
		]);
		// Expect payment service to return { success: true, paymentId }
		if (res && res.data && res.data.success) {
			return { success: true, paymentId: res.data.paymentId };
		}
		return { success: false, reason: 'Payment failed', details: res && res.data };
	} catch (err) {
		error('processPayment error', err.message || err);
		return { success: false, reason: err.message || 'Payment error' };
	}
}

module.exports = { processPayment };
