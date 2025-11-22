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
}

module.exports = new OrderController();
