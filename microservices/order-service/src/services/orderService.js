const axios = require('axios');
const inventoryService = require('./inventoryService');
const kafkaService = require('./kafkaService');
const OrderModel = require('../models/Order');
const { log, error } = require('../utils/logger');

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:8083';
const cartClient = axios.create({ baseURL: CART_SERVICE_URL, timeout: 5000 });

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
	if (!total) {
		try {
			const totRes = await cartClient.get(`/api/cart/${userId}/total`);
			total = totRes.data && totRes.data.total ? totRes.data.total : 0;
		} catch (e) {
			log('Unable to fetch cart total, defaulting to 0', e.message || e);
			total = 0;
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
		// If produce failed, rollback reservations and mark order failed
		for (const r of reservations) {
			try { await inventoryService.release(r.productId, r.quantity); } catch (ex) { error('release during kafka failure', ex); }
		}
		await OrderModel.updateOrder(saved.orderId, { status: 'FAILED', failureReason: 'kafka_publish_failed' });
		throw new Error('Failed to publish payment request');
	}

	// Return the saved order (client or payment consumer will update status later)
	return saved;
}

module.exports = { createOrderFromCart };
