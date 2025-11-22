const User = require('../models/user');

const bcrypt = require('bcrypt');
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

async function createUser(userDTO) {
  const exists = await User.findOne({ where: { email: userDTO.email } });
  if (exists) {
    const err = new Error(`User with email ${userDTO.email} already exists`);
    err.status = 400;
    throw err;
  }

  const hashed = userDTO.password ? await bcrypt.hash(userDTO.password, SALT_ROUNDS) : null;

  const user = await User.create({
    email: userDTO.email,
    firstName: userDTO.firstName,
    lastName: userDTO.lastName,
    password: hashed,
    phone: userDTO.phone,
    isActive: true
  });

  return toDTO(user);
}

async function getUserById(id) {
  const user = await User.findByPk(id);
  return user ? toDTO(user) : null;
}

async function getUserByEmail(email) {
  const user = await User.findOne({ where: { email } });
  return user ? toDTO(user) : null;
}

async function getAllUsers(page = 0, size = 10) {
  const offset = page * size;
  const { rows } = await User.findAndCountAll({ offset, limit: size });
  return rows.map(toDTO);
}

async function updateUser(id, userDTO) {
  const user = await User.findByPk(id);
  if (!user) return null;

  user.firstName = userDTO.firstName;
  user.lastName = userDTO.lastName;
  user.phone = userDTO.phone;
  if (userDTO.password) {
    user.password = await bcrypt.hash(userDTO.password, SALT_ROUNDS);
  }

  const updated = await user.save();
  return toDTO(updated);
}

async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) return false;
  await user.destroy();
  return true;
}

function toDTO(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    isActive: user.isActive
  };
}

async function authenticate(email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user) return null;
  // If password field is missing, fail
  if (!user.password) return null;

  // Detect bcrypt hash (starts with $2a$ or $2b$ or $2y$)
  const isHashed = typeof user.password === 'string' && user.password.startsWith('$2');
  if (isHashed) {
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    return toDTO(user);
  }

  // Legacy plaintext password in DB — compare directly and migrate to hashed password
  if (user.password === password) {
    // Re-hash and persist
    try {
      const hashed = await bcrypt.hash(password, SALT_ROUNDS);
      user.password = hashed;
      await user.save();
    } catch (e) {
      // If migrate fails, still allow login (but log error)
      console.error('Password migration failed for user', user.email, e && e.message);
    }
    return toDTO(user);
  }

  return null;
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser
  ,authenticate
};
