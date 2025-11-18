const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { 
  addItemValidation, 
  updateQuantityValidation, 
  userIdValidation 
} = require('../middleware/validation');

// Cart routes
router.get('/:userId', userIdValidation, cartController.getCart);
router.post('/:userId/items', addItemValidation, cartController.addItem);
router.put('/:userId/items/:productId', updateQuantityValidation, cartController.updateItemQuantity);
router.delete('/:userId/items/:productId', userIdValidation, cartController.removeItem);
router.delete('/:userId', userIdValidation, cartController.clearCart);
router.get('/:userId/total', userIdValidation, cartController.getCartTotal);

module.exports = router;
