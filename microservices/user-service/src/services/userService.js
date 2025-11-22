const User = require('../models/user');

async function createUser(userDTO) {
  const exists = await User.findOne({ where: { email: userDTO.email } });
  if (exists) {
    const err = new Error(`User with email ${userDTO.email} already exists`);
    err.status = 400;
    throw err;
  }

  const user = await User.create({
    email: userDTO.email,
    firstName: userDTO.firstName,
    lastName: userDTO.lastName,
    password: userDTO.password,
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
  if (userDTO.password) user.password = userDTO.password;

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

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getAllUsers,
  updateUser,
  deleteUser
};
