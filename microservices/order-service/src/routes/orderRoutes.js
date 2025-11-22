const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { createOrderValidation, validate } = require('../middleware/validation');

router.post('/', createOrderValidation, validate, orderController.createOrder.bind(orderController));

module.exports = router;
