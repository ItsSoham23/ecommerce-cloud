const axios = require('axios');
const inventoryService = require('./inventoryService');
const kafkaService = require('./kafkaService');
const OrderModel = require('../models/Order');
const { log, error } = require('../utils/logger');

// When running inside Docker on Windows, services in other compose projects
// are reachable via host.docker.internal. Allow overriding via env var.
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://host.docker.internal:8083';
const cartClient = axios.create({ baseURL: CART_SERVICE_URL, timeout: 5000 });
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://host.docker.internal:8082';
const productClient = axios.create({ baseURL: PRODUCT_SERVICE_URL, timeout: 5000 });

const PAYMENT_TIMEOUT_MS = parseInt(process.env.ORDER_PAYMENT_TIMEOUT_MS || '10000', 10);

async function createOrderFromCart(userId, itemsProvided, totalProvided) {
	// Fetch cart items if none provided
	let items = itemsProvided;
	if (!items || !Array.isArray(items) || items.length === 0) {
		const res = await cartClient.get(`/api/cart/${userId}`);
		items = res.data && res.data.items ? res.data.items : [];
	}

	if (!items || items.length === 0) {
		throw new Error('Cart is empty');
	}

	// 1) Check inventory for each item
	for (const it of items) {
		const check = await inventoryService.checkInventory(it.productId, it.quantity);
		if (!check.ok) {
			throw new Error(`Product ${it.productId} unavailable: ${check.reason}`);
		}
	}

	// 2) Reserve/block stock for each item
	const reservations = [];
	for (const it of items) {
		const r = await inventoryService.reserve(it.productId, it.quantity);
		if (!r.ok) {
			// Release any previous reservations
			for (const prev of reservations) {
				try { await inventoryService.release(prev.productId, prev.quantity); } catch (e) { error('release during rollback failed', e); }
			}
			throw new Error(`Failed to reserve product ${it.productId}`);
		}
		reservations.push({ productId: it.productId, quantity: it.quantity });
	}

	// 3) Compute total if not provided
	let total = totalProvided;
	if (typeof total === 'undefined' || total === null) {
		// If items were provided in the request, derive total by fetching product prices
		if (items && Array.isArray(items) && items.length > 0) {
			try {
				let computed = 0;
				for (const it of items) {
					try {
						const prodRes = await productClient.get(`/api/products/${it.productId}`);
						const price = prodRes && prodRes.data && prodRes.data.price ? parseFloat(prodRes.data.price) : 0;
						computed += price * (it.quantity || 0);
					} catch (pe) {
						// If fetching product fails, log and continue (treat price as 0)
						error(`Failed to fetch product ${it.productId} for total calculation`, pe && pe.message ? pe.message : pe);
					}
				}
				total = computed;
			} catch (e) {
				log('Unable to compute total from provided items, falling back to cart total', e.message || e);
				total = null; // trigger cart total fetch below
			}
		}

		if (typeof total === 'undefined' || total === null) {
			try {
				const totRes = await cartClient.get(`/api/cart/${userId}/total`);
				log('Cart total response:', JSON.stringify(totRes && totRes.data ? totRes.data : totRes));
				if (totRes && totRes.data) {
					// cart-service returns { totalAmount, itemCount, ... }
					total = typeof totRes.data.totalAmount !== 'undefined' ? totRes.data.totalAmount : (totRes.data.total || 0);
				} else {
					total = 0;
				}
			} catch (e) {
				log('Unable to fetch cart total, defaulting to 0', e.message || e);
				total = 0;
			}
		}
	}

	const order = {
		orderId: `ord-${Date.now()}`,
		userId,
		items,
		total,
		status: 'AWAITING_PAYMENT'
	};

	// 4) Publish payment.requested event and persist order with AWAITING_PAYMENT
	order.status = 'AWAITING_PAYMENT';
	const saved = await OrderModel.saveOrder(order);
	try {
		await kafkaService.produce('payment.requested', {
			orderId: saved.orderId,
			userId: saved.userId,
			items: saved.items,
			total: saved.total
		});
		log('Published payment.requested for', saved.orderId);
	} catch (e) {
		// If produce failed, do NOT fail the API call. Log and mark the order for later retry.
		error('Kafka publish failed for payment.requested', e && e.message ? e.message : e);
		try {
			await OrderModel.updateOrder(saved.orderId, { failureReason: 'kafka_publish_failed' });
		} catch (upErr) {
			error('Failed to update order with failureReason', upErr && upErr.message ? upErr.message : upErr);
		}
		// Return the saved order so the client can proceed; a background retry should handle publishing.
		return saved;
	}

	// Return the saved order (client or payment consumer will update status later)
	return saved;
}

module.exports = { createOrderFromCart };
