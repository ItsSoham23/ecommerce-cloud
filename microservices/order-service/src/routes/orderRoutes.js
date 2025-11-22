const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { createOrderValidation, validate } = require('../middleware/validation');

router.post('/', createOrderValidation, validate, orderController.createOrder.bind(orderController));
router.get('/user/:userId', orderController.getOrdersByUser.bind(orderController));
router.get('/:orderId', orderController.getOrder.bind(orderController));

module.exports = router;
