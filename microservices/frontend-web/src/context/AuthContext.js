import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { getUserByEmail, registerUser, loginUser } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
  try {
    const resp = await loginUser(email, password);
    if (resp && resp.accessToken) {
      const { accessToken, expiresIn, user: userData } = resp;
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      const userWithoutPassword = { ...userData };
      delete userWithoutPassword.password;
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      localStorage.setItem('accessToken', accessToken);
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials' };
  } catch (error) {
    console.error('Login error:', error.response || error);
    const msg = error.response?.data?.message || 'Login failed';
    return { success: false, error: msg };
  }
};

  const register = async (userData) => {
  try {
    console.log('📤 Registering user:', userData);
    const newUser = await registerUser(userData);
    console.log('✅ Registration successful:', newUser);
    
    const userWithoutPassword = { ...newUser };
    delete userWithoutPassword.password;
    
    setUser(userWithoutPassword);
    localStorage.setItem('user', JSON.stringify(userWithoutPassword));
    return { success: true };
  } catch (error) {
    console.error('❌ Register error:', error);
    console.error('📋 Error details:', error.response?.data);
    console.error('📊 Error status:', error.response?.status);

    // Build a helpful error message from server response
    let serverMsg = error.response?.data?.message || error.response?.data?.error || null;
    const serverErrors = error.response?.data?.errors;
    const fieldErrors = {};
    if (Array.isArray(serverErrors) && serverErrors.length > 0) {
      // Collect field specific messages and also build a summary message
      serverErrors.forEach(e => {
        const key = e.param || e.path || e.field || 'general';
        fieldErrors[key] = e.msg || e.message || JSON.stringify(e);
      });
      if (!serverMsg) serverMsg = serverErrors.map(e => e.msg || JSON.stringify(e)).join('; ');
    }

    const finalMsg = serverMsg || error.message || 'Registration failed';
    return { success: false, error: finalMsg, fieldErrors };
  }
};
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};