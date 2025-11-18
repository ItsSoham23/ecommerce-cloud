const cartService = require('../services/cartService');

class CartController {
  async getCart(req, res, next) {
    try {
      const { userId } = req.params;
      const cart = await cartService.getCart(userId);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }

  async addItem(req, res, next) {
    try {
      const { userId } = req.params;
      const { productId, quantity, productName, price } = req.body;
      
      const cart = await cartService.addItem(userId, {
        productId,
        quantity,
        productName,
        price
      });
      
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }

  async updateItemQuantity(req, res, next) {
    try {
      const { userId, productId } = req.params;
      const { quantity } = req.body;
      
      const cart = await cartService.updateItemQuantity(userId, productId, quantity);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req, res, next) {
    try {
      const { userId, productId } = req.params;
      const cart = await cartService.removeItem(userId, productId);
      res.status(200).json(cart);
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await cartService.clearCart(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getCartTotal(req, res, next) {
    try {
      const { userId } = req.params;
      const total = await cartService.getCartTotal(userId);
      res.status(200).json(total);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CartController();
