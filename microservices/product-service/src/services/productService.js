const Product = require('../models/Product');
const { s3 } = require('../config/s3');
const { Op } = require('sequelize');

class ProductService {
  async createProduct(productData) {
    try {
      const product = await Product.create(productData);
      return product;
    } catch (error) {
      throw new Error(`Error creating product: ${error.message}`);
    }
  }

  async getAllProducts(filters = {}) {
    try {
      const where = {};
      
      if (filters.category) {
        where.category = filters.category;
      }
      
      if (filters.minPrice || filters.maxPrice) {
        where.price = {};
        if (filters.minPrice) where.price[Op.gte] = filters.minPrice;
        if (filters.maxPrice) where.price[Op.lte] = filters.maxPrice;
      }
      
      if (filters.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }
      
      where.isActive = true;

      const products = await Product.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });
      
      return products;
    } catch (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }
  }

  async getProductById(id) {
    try {
      const product = await Product.findByPk(id);
      if (!product) {
        throw new Error('Product not found');
      }
      return product;
    } catch (error) {
      throw new Error(`Error fetching product: ${error.message}`);
    }
  }

  async updateProduct(id, productData) {
    try {
      const product = await Product.findByPk(id);
      if (!product) {
        throw new Error('Product not found');
      }
      
      await product.update(productData);
      return product;
    } catch (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }
  }

  async deleteProduct(id) {
    try {
      const product = await Product.findByPk(id);
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Soft delete
      await product.update({ isActive: false });
      return { message: 'Product deleted successfully' };
    } catch (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }

  async uploadProductImage(productId, file) {
    try {
      const product = await Product.findByPk(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const bucketName = process.env.S3_BUCKET_RAW || 'ecommerce-products-raw';
      const key = `products/${productId}/${Date.now()}-${file.originalname}`;

      const params = {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      };

      const uploadResult = await s3.upload(params).promise();
      
      // Update product with S3 info
      await product.update({
        s3Key: key,
        imageUrl: uploadResult.Location
      });

      return {
        message: 'Image uploaded successfully',
        imageUrl: uploadResult.Location,
        s3Key: key
      };
    } catch (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
  }

  async updateStock(productId, quantity) {
    try {
      const product = await Product.findByPk(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const newStock = product.stock + quantity;
      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }

      await product.update({ stock: newStock });
      return product;
    } catch (error) {
      throw new Error(`Error updating stock: ${error.message}`);
    }
  }
}

module.exports = new ProductService();