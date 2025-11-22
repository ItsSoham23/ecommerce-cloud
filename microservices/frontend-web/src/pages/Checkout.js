import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function Checkout() {
  const { cart } = useCart();
  const navigate = useNavigate();

  const handlePlaceOrder = () => {
    alert('Order service is not yet implemented. This will integrate with order-service once ready.');
    // Future: call createOrder API
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1>Checkout</h1>
      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', marginTop: '20px' }}>
        <h2>Order Summary</h2>
        <div style={{ marginTop: '20px' }}>
          {cart.items?.map(item => (
            <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
              <span>{item.product?.name} x {item.quantity}</span>
              <span>${(item.product?.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total:</span>
            <span style={{ color: '#2563eb' }}>${(cart.total + 10 + cart.total * 0.1).toFixed(2)}</span>
          </div>
        </div>
        <button 
          onClick={handlePlaceOrder}
          className="btn-primary"
          style={{ width: '100%', marginTop: '30px', padding: '14px', fontSize: '16px' }}
        >
          Place Order
        </button>
        <button 
          onClick={() => navigate('/cart')}
          className="btn-secondary"
          style={{ width: '100%', marginTop: '10px', padding: '14px', fontSize: '16px', textAlign: 'center' }}
        >
          Back to Cart
        </button>
      </div>
    </div>
  );
}

export default Checkout;