const { validationResult } = require('express-validator');
const userService = require('../services/userService');

async function createUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

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

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser
};
