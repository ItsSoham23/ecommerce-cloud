import React, { createContext, useState, useContext, useEffect } from 'react';
import { getUserByEmail, registerUser } from '../services/api';

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
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
  try {
    // Get user by email
    const userData = await getUserByEmail(email);
    
    if (userData) {
      // Since backend doesn't return password, we'll just accept any login
      // TODO: Implement proper backend authentication
      const userWithoutPassword = { ...userData };
      delete userWithoutPassword.password;
      
      setUser(userWithoutPassword);
      localStorage.setItem('user', JSON.stringify(userWithoutPassword));
      return { success: true };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Login failed' };
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
    return { 
      success: false, 
      error: error.response?.data?.message || error.message || 'Registration failed' 
    };
  }
};
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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