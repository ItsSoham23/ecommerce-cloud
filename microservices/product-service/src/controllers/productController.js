const productService = require('../services/productService');

class ProductController {
  async createProduct(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async getAllProducts(req, res, next) {
    try {
      const filters = {
        category: req.query.category,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        search: req.query.search,
        includeInactive: req.query.includeInactive === 'true'
      };
      
      const products = await productService.getAllProducts(filters);
      res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const result = await productService.deleteProduct(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await productService.uploadProductImage(req.params.id, req.file);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateStock(req, res, next) {
    try {
      const { quantity, orderId } = req.body;
      const product = await productService.updateStock(req.params.id, quantity, { orderId });
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async clearReservation(req, res, next) {
    try {
      const { orderId } = req.body;
      const product = await productService.clearReservation(req.params.id, orderId);
      res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();