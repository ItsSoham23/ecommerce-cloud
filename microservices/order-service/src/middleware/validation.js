const { body, validationResult } = require('express-validator');

const createOrderValidation = [
	body('userId').isString().withMessage('userId is required'),
	body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
	body('items.*.productId').isString().withMessage('productId is required for each item'),
	body('items.*.quantity').isInt({ gt: 0 }).withMessage('quantity must be > 0')
];

function validate(req, res, next) {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	next();
}

module.exports = { createOrderValidation, validate };
