const { createClient } = require('../utils/httpClient');
const { log, error } = require('../utils/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8082';
const client = createClient(PRODUCT_SERVICE_URL, 5000);

async function checkInventory(productId, requiredQuantity) {
	try {
		const res = await client.get(`/api/products/${productId}`);
		const product = res.data;
		if (!product) return { ok: false, reason: 'Product not found' };
		// If product has a reservation marker from product-service, treat it as reserved
		if (product._reserved) return { ok: false, reason: 'Product reserved', product };
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

		// Log reservation payload for debugging inventory interactions
		console.log('inventoryService.reserve ->', { productId, body });

		const res = await client.patch(`/api/products/${productId}/stock`, body);
		return { ok: true, product: res.data };
	} catch (err) {
		error('reserve error', err.message || err);
		// Parse upstream (product-service) structured error when available so callers
		// can present a clear message (e.g. Out of stock vs reserved).
		let reason = 'Reserve failed';
		let status = undefined;
		if (err && err.response && err.response.data) {
			const body = err.response.data;
			reason = (body && body.error && body.error.message) || body.message || JSON.stringify(body);
			status = err.response.status;
		} else if (err && err.message) {
			reason = err.message;
		}
		return { ok: false, reason, status };
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
		// Previously this method increased persisted stock when rolling back a
		// reservation. That caused incorrect stock changes when callers used
		// `release` during error handling. To ensure stock only changes on
		// explicit commit, make `release` clear any matching reservation
		// instead of modifying `stock`.
		const body = {};
		// If caller provides an orderId in `quantity` (legacy callers), prefer
		// to pass it through via the body. But APIs should call clearReservation
		// explicitly with orderId when available.
		if (typeof quantity === 'string' || typeof quantity === 'number') {
			// nothing to do here — keep backward compatibility placeholder
		}
		const res = await client.patch(`/api/products/${productId}/clear-reservation`, body);
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
