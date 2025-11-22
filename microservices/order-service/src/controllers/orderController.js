const orderService = require('../services/orderService');

class OrderController {
	async createOrder(req, res, next) {
		try {
			const { userId, items, total } = req.body;
			const saved = await orderService.createOrderFromCart(userId, items, total);
			res.status(201).json(saved);
		} catch (err) {
			next(err);
		}
	}

	async getOrdersByUser(req, res, next) {
		try {
			const userId = req.params.userId;
			const orders = await orderService.getOrdersByUser(userId);
			res.json(orders);
		} catch (err) {
			next(err);
		}
	}

	async getOrder(req, res, next) {
		try {
			const orderId = req.params.orderId;
			const order = await orderService.getOrderById(orderId);
			if (!order) return res.status(404).send();
			res.json(order);
		} catch (err) {
			next(err);
		}
	}
}

module.exports = new OrderController();
