const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/userController');

const router = express.Router();

router.get('/health', (req, res) => res.send('User Service is healthy'));

router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('phone').optional().isString()
  ],
  controller.createUser
);

router.post('/login', [body('email').isEmail(), body('password').isLength({ min: 6 })], controller.login);

router.get('/:id', controller.getUserById);
router.get('/email/:email', controller.getUserByEmail);
router.get('/', controller.getAllUsers);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
