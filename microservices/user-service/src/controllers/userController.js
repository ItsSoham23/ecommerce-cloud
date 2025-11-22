const { validationResult } = require('express-validator');
const userService = require('../services/userService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

async function createUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Validation failed', errors: errors.array() });

    const created = await userService.createUser(req.body);
    return res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).send();
    return res.json(user);
  } catch (e) {
    next(e);
  }
}

async function getUserByEmail(req, res, next) {
  try {
    const user = await userService.getUserByEmail(req.params.email);
    if (!user) return res.status(404).send();
    return res.json(user);
  } catch (e) {
    next(e);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page || '0', 10);
    const size = parseInt(req.query.size || '10', 10);
    const users = await userService.getAllUsers(page, size);
    return res.json(users);
  } catch (e) {
    next(e);
  }
}

async function updateUser(req, res, next) {
  try {
    const updated = await userService.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).send();
    return res.json(updated);
  } catch (e) {
    next(e);
  }
}

async function deleteUser(req, res, next) {
  try {
    const deleted = await userService.deleteUser(req.params.id);
    if (!deleted) return res.status(404).send();
    return res.status(204).send();
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await userService.authenticate(email, password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    // Sign JWT
    const payload = { sub: user.id, email: user.email };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ accessToken, expiresIn: JWT_EXPIRES_IN, user });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser
  ,login
};
