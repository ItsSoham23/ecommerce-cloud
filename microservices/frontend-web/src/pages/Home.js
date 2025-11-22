import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

function Home() {
  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>Welcome to Our E-Commerce Store</h1>
        <p>Discover amazing products at great prices</p>
        <Link to="/products" className="btn-primary btn-large">
          Shop Now
        </Link>
      </div>

      <div className="features-section">
        <div className="feature">
          <div className="feature-icon">🚚</div>
          <h3>Fast Delivery</h3>
          <p>Get your orders delivered quickly</p>
        </div>

        <div className="feature">
          <div className="feature-icon">💳</div>
          <h3>Secure Payment</h3>
          <p>Safe and secure transactions</p>
        </div>

        <div className="feature">
          <div className="feature-icon">🎁</div>
          <h3>Quality Products</h3>
          <p>Top-quality items guaranteed</p>
        </div>
      </div>
    </div>
  );
}

export default Home;