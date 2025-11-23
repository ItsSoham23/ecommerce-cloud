import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderById, getProductById } from '../services/api';
import { processPayment } from '../services/api';

function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getOrderById(orderId);
        const ord = res;
        // Normalize wrapper shapes (DynamoDB SDK or other callers may wrap results)
        const maybe = ord && (ord.value || ord.Items || ord.Items || ord);
        const orderObj = Array.isArray(maybe) ? maybe[0] : (ord && ord.item) ? ord.item : ord;

        // If API returned a wrapper with value/Items, prefer the contained object
        const finalOrder = orderObj && orderObj.orderId ? orderObj : ord;

        // Enrich items with price/productName if missing
        if (finalOrder && Array.isArray(finalOrder.items)) {
          await Promise.all(finalOrder.items.map(async (it) => {
            try {
              if (typeof it.price === 'undefined' || it.price === null || it.price === 0) {
                const prod = await getProductById(String(it.productId));
                if (prod) {
                  it.price = Number(prod.price ?? prod.productPrice ?? it.price ?? 0);
                  it.productName = it.productName ?? (prod.name || prod.productName);
                }
              }
              // ensure numeric quantity
              it.quantity = Number(it.quantity || 0);
            } catch (pe) {
              // ignore enrichment errors
            }
          }));
        }

        setOrder(finalOrder);
      } catch (e) {
        console.error('Failed to load order', e);
        setError(e?.response?.data?.message || e.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const submitPayment = async (result) => {
    if (!order) return;
    try {
      const body = {
        orderId: order.orderId,
        amount: order.total,
        userId: order.userId,
        simulate: result // 'succeeded' or 'failed'
      };
      console.debug('Submitting payment', body);
      const resp = await processPayment(body);
      console.debug('Payment API response', resp);
      if (resp && resp.success) {
        alert('Payment processed: ' + (resp.paymentId || 'ok'));
        navigate('/orders');
      } else {
        const msg = resp && (resp.message || resp.error) ? (resp.message || resp.error) : 'Payment failed';
        console.error('Payment response indicates failure', resp);
        // show clearer message for dev
        alert('Payment failed: ' + msg + '\n(see console for full response)');
        navigate('/orders');
      }
    } catch (e) {
      console.error('Payment request failed', e);
      const errMsg = e?.response?.data?.message || e?.message || 'Payment request failed';
      alert(`Payment request failed: ${errMsg}\n(see console for details)`);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading order...</div>;
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>;
  if (!order) return <div style={{ padding: 20 }}>Order not found.</div>;

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <h1>Payment</h1>
      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div><strong>Order:</strong> {order.orderId}</div>
            <div style={{ color: '#666', marginTop: 6 }}>Status: {order.status}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, color: '#2563eb', fontWeight: 700 }}>${Number(order.total ?? 0).toFixed(2)}</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <h3>Items</h3>
          <ul>
            {(order.items || []).map((it, idx) => (
              <li key={idx}>{it.productName ?? it.product?.name ?? it.productId} x {it.quantity} — ${(Number(it.price ?? it.product?.price ?? 0) * Number(it.quantity || 0)).toFixed(2)}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn-primary" onClick={() => submitPayment('succeeded')}>Simulate Success</button>
          <button className="btn-secondary" onClick={() => submitPayment('failed')}>Simulate Failure</button>
        </div>
      </div>
    </div>
  );
}

export default Payment;
