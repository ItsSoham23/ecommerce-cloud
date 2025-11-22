const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/userController');

const router = express.Router();

router.get('/health', (req, res) => res.send('User Service is healthy'));

router.post(
  '/',
  [body('email').isEmail(), body('password').isLength({ min: 6 }).optional({ nullable: true })],
  controller.createUser
);

router.get('/:id', controller.getUserById);
router.get('/email/:email', controller.getUserByEmail);
router.get('/', controller.getAllUsers);
router.put('/:id', controller.updateUser);
router.delete('/:id', controller.deleteUser);

module.exports = router;
