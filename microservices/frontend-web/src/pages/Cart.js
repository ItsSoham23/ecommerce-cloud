import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import '../styles/Cart.css';

function Cart() {
  const { cart, loading, updateItem, removeItem, clear } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await updateItem(productId, newQuantity);
    } catch (err) {
      alert('Failed to update quantity');
    }
  };

  const handleRemove = async (productId) => {
    if (window.confirm('Remove this item from cart?')) {
      try {
        await removeItem(productId);
      } catch (err) {
        alert('Failed to remove item');
      }
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Clear entire cart?')) {
      try {
        await clear();
      } catch (err) {
        alert('Failed to clear cart');
      }
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading) return <div className="loading">Loading cart...</div>;

  if (!cart.items || cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Your cart is empty</h2>
        <button className="btn-primary" onClick={() => navigate('/products')}>
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <button className="btn-danger" onClick={handleClearCart}>
          Clear Cart
        </button>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {cart.items.map((item) => (
            <div key={item.productId} className="cart-item">
              <div className="item-image">
                <img 
                  src={item.product?.imageUrl || '/placeholder-product.png'} 
                  alt={item.product?.name}
                />
              </div>

              <div className="item-details">
                <h3>{item.product?.name}</h3>
                <p className="item-price">${parseFloat(item.product?.price).toFixed(2)}</p>
              </div>

              <div className="item-quantity">
                <button 
                  onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="item-total">
                <span>${(parseFloat(item.product?.price) * item.quantity).toFixed(2)}</span>
              </div>

              <button 
                className="item-remove"
                onClick={() => handleRemove(item.productId)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${cart.total?.toFixed(2) || '0.00'}</span>
          </div>

          <div className="summary-row">
            <span>Shipping:</span>
            <span>$10.00</span>
          </div>

          <div className="summary-row">
            <span>Tax:</span>
            <span>${(cart.total * 0.1).toFixed(2)}</span>
          </div>

          <div className="summary-total">
            <span>Total:</span>
            <span>${(cart.total + 10 + cart.total * 0.1).toFixed(2)}</span>
          </div>

          <button className="btn-primary btn-checkout" onClick={handleCheckout}>
            Proceed to Checkout
          </button>

          <button 
            className="btn-secondary" 
            onClick={() => navigate('/products')}
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

export default Cart;