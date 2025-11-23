const { createClient } = require('../utils/httpClient');
const { log, error } = require('../utils/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8082';
const client = createClient(PRODUCT_SERVICE_URL, 5000);

async function checkInventory(productId, requiredQuantity) {
	try {
		const res = await client.get(`/api/products/${productId}`);
		const product = res.data;
		if (!product) return { ok: false, reason: 'Product not found' };
		if (product.stock >= requiredQuantity) return { ok: true, product };
		return { ok: false, reason: 'Insufficient stock', product };
	} catch (err) {
		error('checkInventory error', err.message || err);
		return { ok: false, reason: 'Inventory check failed' };
	}
}

async function reserve(productId, quantity, orderId) {
	try {
		// product service expects a quantity delta (can be negative to reduce stock)
		const body = { quantity: -Math.abs(quantity) };
		if (orderId) body.orderId = orderId;
		const res = await client.patch(`/api/products/${productId}/stock`, body);
		return { ok: true, product: res.data };
	} catch (err) {
		error('reserve error', err.message || err);
		return { ok: false, reason: 'Reserve failed' };
	}
}

async function clearReservation(productId, orderId) {
	try {
		const body = {};
		if (orderId) body.orderId = orderId;
		const res = await client.patch(`/api/products/${productId}/clear-reservation`, body);
		return { ok: true, product: res.data };
	} catch (err) {
		error('clearReservation error', err.message || err);
		return { ok: false, reason: 'Clear reservation failed' };
	}
}

async function release(productId, quantity) {
	try {
		const res = await client.patch(`/api/products/${productId}/stock`, { quantity: Math.abs(quantity) });
		return { ok: true, product: res.data };
	} catch (err) {
		error('release error', err.message || err);
		return { ok: false, reason: 'Release failed' };
	}
}

async function commit(productId, quantity, orderId) {
	try {
		const body = { quantity: Math.abs(quantity) };
		if (orderId) body.orderId = orderId;
		// Call /commit endpoint which will decrement persisted stock and clear reservation
		const res = await client.patch(`/api/products/${productId}/commit`, body);
		return { ok: true, product: res.data };
	} catch (err) {
		error('commit error', err.message || err);
		return { ok: false, reason: 'Commit failed' };
	}
}

module.exports = { checkInventory, reserve, release, clearReservation, commit };
