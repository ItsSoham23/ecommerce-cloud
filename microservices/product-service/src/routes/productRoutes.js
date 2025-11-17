const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');

// Product CRUD routes
router.post('/', productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

// Image upload route
router.post('/:id/upload-image', upload.single('image'), productController.uploadImage);

// Stock management
router.patch('/:id/stock', productController.updateStock);

module.exports = router;