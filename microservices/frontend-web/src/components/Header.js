import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import '../styles/Header.css';

function Header() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const cartItemCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          E-Commerce
        </Link>

        <nav className="nav">
          <Link to="/products">Products</Link>
          {user && <Link to="/profile">Profile</Link>}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <Link to="/cart" className="cart-link">
                Cart
                {cartItemCount > 0 && (
                  <span className="cart-badge">{cartItemCount}</span>
                )}
              </Link>
              <span className="user-name">Hi, {user.firstName}</span>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Login</Link>
              <Link to="/register" className="btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;