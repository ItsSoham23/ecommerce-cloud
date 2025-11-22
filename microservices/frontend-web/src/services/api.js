import axios from 'axios';

// Direct service URLs - no proxy needed
const USER_SERVICE = process.env.REACT_APP_USER_SERVICE || 'http://localhost:8081';
const PRODUCT_SERVICE = process.env.REACT_APP_PRODUCT_SERVICE || 'http://localhost:8082';
const CART_SERVICE = process.env.REACT_APP_CART_SERVICE || 'http://localhost:8083';

// User Service APIs
export const registerUser = async (userData) => {
  const response = await axios.post(`${USER_SERVICE}/api/users`, userData);
  return response.data;
};

export const getUserById = async (userId) => {
  const response = await axios.get(`${USER_SERVICE}/api/users/${userId}`);
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await axios.post(`${USER_SERVICE}/api/users/login`, { email, password });
  return response.data;
};

export const getUserByEmail = async (email) => {
  const response = await axios.get(`${USER_SERVICE}/api/users/email/${email}`);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await axios.put(`${USER_SERVICE}/api/users/${userId}`, userData);
  return response.data;
};

// Product Service APIs
export const getAllProducts = async (page = 0, size = 20) => {
  const response = await axios.get(`${PRODUCT_SERVICE}/api/products?page=${page}&size=${size}`);
  return response.data;
};

export const getProductById = async (productId) => {
  const response = await axios.get(`${PRODUCT_SERVICE}/api/products/${productId}`);
  return response.data;
};

export const searchProducts = async (query) => {
  const response = await axios.get(`${PRODUCT_SERVICE}/api/products?search=${query}`);
  return response.data;
};

// Cart Service APIs
export const getCart = async (userId) => {
  const response = await axios.get(`${CART_SERVICE}/api/cart/${userId}`);
  return response.data;
};

export const addToCart = async (userId, productId, quantity) => {
  const response = await axios.post(`${CART_SERVICE}/api/cart/${userId}/items`, {
    productId,
    quantity
  });
  return response.data;
};

export const updateCartItem = async (userId, productId, quantity) => {
  const response = await axios.put(`${CART_SERVICE}/api/cart/${userId}/items/${productId}`, {
    quantity
  });
  return response.data;
};

export const removeFromCart = async (userId, productId) => {
  const response = await axios.delete(`${CART_SERVICE}/api/cart/${userId}/items/${productId}`);
  return response.data;
};

export const clearCart = async (userId) => {
  const response = await axios.delete(`${CART_SERVICE}/api/cart/${userId}`);
  return response.data;
};

export const getCartTotal = async (userId) => {
  const response = await axios.get(`${CART_SERVICE}/api/cart/${userId}/total`);
  return response.data;
};

// Order Service APIs
const ORDER_SERVICE = process.env.REACT_APP_ORDER_SERVICE || 'http://localhost:8084';

export const createOrder = async (orderData) => {
  const response = await axios.post(`${ORDER_SERVICE}/api/orders`, orderData);
  return response.data;
};

export const getOrderById = async (orderId) => {
  const response = await axios.get(`${ORDER_SERVICE}/api/orders/${orderId}`);
  return response.data;
};

export const getUserOrders = async (userId) => {
  const response = await axios.get(`${ORDER_SERVICE}/api/orders/user/${userId}`);
  return response.data;
};

// Payment Service APIs
const PAYMENT_SERVICE = process.env.REACT_APP_PAYMENT_SERVICE || 'http://localhost:8085';

export const processPayment = async (paymentData) => {
  const response = await axios.post(`${PAYMENT_SERVICE}/api/payments`, paymentData);
  return response.data;
};