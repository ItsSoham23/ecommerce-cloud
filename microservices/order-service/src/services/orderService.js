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

		// generate orderId early so reservations can reference it
		const generatedOrderId = `ord-${Date.now()}`;

		// 1) Check inventory for each item and cache results so we can decide
		// whether to create DB reservations below.
		const inventoryChecks = {};
		for (const it of items) {
			const check = await inventoryService.checkInventory(it.productId, it.quantity);
			inventoryChecks[it.productId] = check;
			if (!check.ok) {
				// Map inventoryService reasons to HTTP-friendly errors
				let message = check.reason || 'Product unavailable';
				let status = 409;
				if (message === 'Product not found') status = 404;
				if (message === 'Insufficient stock') message = `Insufficient stock for product ${it.productId}`;
				if (message === 'Product reserved') message = `Product ${it.productId} is reserved by another order`;
				const err = new Error(message);
				err.status = status;
				throw err;
			}
		}

		// 2) Reserve/block stock for each item (pass orderId so product can mark reservation)
	const reservations = [];
	for (const it of items) {
			// Decide whether to create a DB reservation. Only reserve when this
			// order would consume the remaining stock — i.e. available - required <= 0.
			// Default to NOT reserving to avoid accidental locks when values are
			// missing or malformed. Only set reservation when check explicitly
			// indicates available - required <= 0.
			const check = inventoryChecks[it.productId];
			let shouldReserve = false;
			if (check && check.product && typeof check.product.stock !== 'undefined') {
				const available = parseInt(check.product.stock, 10);
				const required = parseInt(it.quantity, 10);
				if (!Number.isNaN(available) && !Number.isNaN(required)) {
					shouldReserve = (available - required) <= 0;
				}
				// Log decision for debugging in the cluster
				log(`reserve-decision product=${it.productId} available=${available} required=${required} shouldReserve=${shouldReserve}`);
			} else {
				log(`reserve-decision product=${it.productId} missing inventory check or stock; default shouldReserve=false`);
			}
			let r = { ok: true, product: null };
			if (shouldReserve) {
				r = await inventoryService.reserve(it.productId, it.quantity, generatedOrderId);
			}
			if (!r.ok) {
			// Release any previous reservations
			for (const prev of reservations) {
				try { await inventoryService.clearReservation(prev.productId, generatedOrderId); } catch (e) { error('clear reservation during rollback failed', e); }
			}
			// Surface a clearer error message and status so controllers can return
			// a helpful response to the API caller (e.g. Out of stock or Product reserved).
			const err = new Error(r.reason || `Failed to reserve product ${it.productId}`);
			if (r.status) err.status = r.status;
			else err.status = 409;
			throw err;
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
						const prod = prodRes && prodRes.data ? prodRes.data : null;
						const price = prod && prod.price ? parseFloat(prod.price) : 0;
						const name = prod && (prod.name || prod.productName) ? (prod.name || prod.productName) : undefined;
						// Enrich the item with a historical snapshot so orders persist price/name
						it.price = price;
						if (name) it.productName = name;
						computed += price * (it.quantity || 0);
						log(`Fetched product ${it.productId} price=${price} qty=${it.quantity} subtotal=${price * (it.quantity || 0)}`);
					} catch (pe) {
						// If fetching product fails, log and continue (treat price as 0)
						error(`Failed to fetch product ${it.productId} for total calculation`, pe && pe.message ? pe.message : pe);
						// ensure fields exist to avoid undefined later
						it.price = Number(it.price ?? 0);
						it.productName = it.productName ?? undefined;
					}
				}
				log(`Computed total from products: ${computed}`);
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
      orderId: generatedOrderId,
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

async function getOrdersByUser(userId) {
	return await OrderModel.getOrdersByUser(userId);
}

async function getOrderById(orderId) {
	return await OrderModel.getOrder(orderId);
}

module.exports = { createOrderFromCart, getOrdersByUser, getOrderById };
