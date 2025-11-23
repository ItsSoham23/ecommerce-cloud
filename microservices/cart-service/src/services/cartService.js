const { dynamoDB } = require('../config/database');
const CartModel = require('../models/Cart');
const { cartOperationsCounter } = require('../middleware/metrics');
const axios = require('axios'); // ADD THIS

const TABLE_NAME = CartModel.getTableName();
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8082';

class CartService {
  // NEW METHOD: Validate product exists
  async validateProduct(productId) {
    try {
      const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error(`Product ${productId} not found`);
      }
      throw new Error(`Error validating product: ${error.message}`);
    }
  }

  async getCart(userId) {
    try {
      const params = {
        TableName: TABLE_NAME,
        Key: { userId }
      };

      const result = await dynamoDB.get(params).promise();
      
      cartOperationsCounter.inc({ operation: 'get', status: 'success' });
      
      return result.Item || {
        userId,
        items: [],
        totalAmount: 0,
        itemCount: 0,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      cartOperationsCounter.inc({ operation: 'get', status: 'error' });
      throw new Error(`Error fetching cart: ${error.message}`);
    }
  }

  async addItem(userId, itemData) {
    try {
      const { productId, quantity } = itemData;
      
      // VALIDATE PRODUCT EXISTS - Get real data from Product Service
      const product = await this.validateProduct(productId);
      
      const cart = await this.getCart(userId);

      // Normalize productId as string for consistent comparison/storage
      const pid = product.id.toString();

      // Check if item exists in cart (compare as strings)
      const existingItemIndex = cart.items.findIndex(item => String(item.productId) === pid);

      if (existingItemIndex >= 0) {
        // Update existing item quantity (ensure numeric math)
        cart.items[existingItemIndex].quantity = (Number(cart.items[existingItemIndex].quantity) || 0) + Number(quantity);
      } else {
        // Add new item with REAL product data from Product Service
        cart.items.push({
          productId: pid,
          productName: product.name,
          price: parseFloat(product.price),
          quantity: Number(quantity),
          addedAt: new Date().toISOString()
        });
      }

      // Recalculate totals
      cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      cart.updatedAt = new Date().toISOString();

      const params = {
        TableName: TABLE_NAME,
        Item: cart
      };

      await dynamoDB.put(params).promise();
      
      cartOperationsCounter.inc({ operation: 'add_item', status: 'success' });
      
      return cart;
    } catch (error) {
      cartOperationsCounter.inc({ operation: 'add_item', status: 'error' });
      throw new Error(`Error adding item to cart: ${error.message}`);
    }
  }

  // ... rest of the methods remain the same
  async updateItemQuantity(userId, productId, quantity) {
    try {
      const cart = await this.getCart(userId);
      // Normalize productId comparison
      const pid = String(productId);
      const itemIndex = cart.items.findIndex(item => String(item.productId) === pid);
      
      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      if (quantity === 0) {
        return await this.removeItem(userId, productId);
      }

      cart.items[itemIndex].quantity = quantity;
      cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      cart.updatedAt = new Date().toISOString();

      const params = {
        TableName: TABLE_NAME,
        Item: cart
      };

      await dynamoDB.put(params).promise();
      
      cartOperationsCounter.inc({ operation: 'update_quantity', status: 'success' });
      
      return cart;
    } catch (error) {
      cartOperationsCounter.inc({ operation: 'update_quantity', status: 'error' });
      throw new Error(`Error updating item quantity: ${error.message}`);
    }
  }

  async removeItem(userId, productId) {
    try {
      const cart = await this.getCart(userId);
      // Normalize productId comparison
      const pid = String(productId);
      cart.items = cart.items.filter(item => String(item.productId) !== pid);
      cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      cart.updatedAt = new Date().toISOString();

      const params = {
        TableName: TABLE_NAME,
        Item: cart
      };

      await dynamoDB.put(params).promise();
      
      cartOperationsCounter.inc({ operation: 'remove_item', status: 'success' });
      
      return cart;
    } catch (error) {
      cartOperationsCounter.inc({ operation: 'remove_item', status: 'error' });
      throw new Error(`Error removing item from cart: ${error.message}`);
    }
  }

  async clearCart(userId) {
    try {
      const emptyCart = {
        userId,
        items: [],
        totalAmount: 0,
        itemCount: 0,
        updatedAt: new Date().toISOString()
      };

      const params = {
        TableName: TABLE_NAME,
        Item: emptyCart
      };

      await dynamoDB.put(params).promise();
      
      cartOperationsCounter.inc({ operation: 'clear', status: 'success' });
      
      return { message: 'Cart cleared successfully', cart: emptyCart };
    } catch (error) {
      cartOperationsCounter.inc({ operation: 'clear', status: 'error' });
      throw new Error(`Error clearing cart: ${error.message}`);
    }
  }

  async getCartTotal(userId) {
    try {
      const cart = await this.getCart(userId);
      
      return {
        userId,
        totalAmount: cart.totalAmount,
        itemCount: cart.itemCount,
        items: cart.items.length
      };
    } catch (error) {
      throw new Error(`Error calculating cart total: ${error.message}`);
    }
  }
}

module.exports = new CartService();