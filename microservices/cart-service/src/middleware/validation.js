const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// UPDATED: Only validate productId and quantity
const addItemValidation = [
  param('userId').notEmpty().withMessage('User ID is required'),
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  // REMOVED: productName and price validation - fetched from Product Service
  validate
];

const updateQuantityValidation = [
  param('userId').notEmpty().withMessage('User ID is required'),
  param('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or greater'),
  validate
];

const userIdValidation = [
  param('userId').notEmpty().withMessage('User ID is required'),
  validate
];

module.exports = {
  addItemValidation,
  updateQuantityValidation,
  userIdValidation
};