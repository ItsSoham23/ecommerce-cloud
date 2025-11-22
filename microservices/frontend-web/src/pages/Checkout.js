import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/api';

function Checkout() {
  const { cart } = useCart();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { clear } = useCart();

  const handlePlaceOrder = async () => {
    if (!user) {
      // Protected route should prevent this, but guard anyway
      alert('Please log in before placing an order.');
      navigate('/login');
      return;
    }

    // Build order payload expected by order-service
    const items = (cart.items || []).map(it => ({
      productId: it.productId ?? it.product?.id ?? it.product?.productId,
      quantity: Number(it.quantity) || 0
    }));

    const orderData = {
      userId: user.id,
      items,
      total: safeTotal
    };

    try {
      const saved = await createOrder(orderData);
      // Clear cart locally and on backend
      try { await clear(); } catch (e) { /* best-effort */ }
      // Navigate to payment page for the created order
      navigate(`/payment/${saved.orderId}`);
    } catch (e) {
      console.error('Place order failed', e && e.response ? e.response.data : e);
      const msg = e?.response?.data?.message || e?.message || 'Order failed';
      alert(`Order failed: ${msg}`);
    }
  };

  const safeTotal = Number(cart?.totalAmount ?? cart?.total ?? 0);

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1>Checkout</h1>
      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', marginTop: '20px' }}>
        <h2>Order Summary</h2>
        <div style={{ marginTop: '20px' }}>
          {cart.items?.map(item => {
            const unitPrice = Number(item.product?.price ?? item.price ?? 0);
            const lineTotal = unitPrice * (Number(item.quantity) || 0);
            return (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                <span>{item.product?.name ?? item.productName ?? 'Product'} x {item.quantity}</span>
                <span>${lineTotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e2e8f0', fontSize: '20px', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total:</span>
            <span style={{ color: '#2563eb' }}>${(safeTotal + 10 + safeTotal * 0.1).toFixed(2)}</span>
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