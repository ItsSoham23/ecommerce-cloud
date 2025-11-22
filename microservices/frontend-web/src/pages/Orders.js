import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserOrders, getProductById } from '../services/api';

function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getUserOrders(String(user.id));
        const list = res || [];
        // Enrich items that don't have price/productName by fetching product details
        await Promise.all(list.map(async (order) => {
          if (!Array.isArray(order.items)) return;
          await Promise.all(order.items.map(async (it) => {
            if (typeof it.price === 'undefined' || it.price === null) {
              try {
                const prod = await getProductById(String(it.productId));
                if (prod) {
                  it.price = Number(prod.price ?? prod.productPrice ?? 0);
                  it.productName = it.productName ?? (prod.name || prod.productName);
                }
              } catch (pe) {
                // ignore per-item enrichment errors
                // leave price undefined so UI falls back to 0
              }
            }
          }));
        }));
        setOrders(list);
      } catch (e) {
        console.error('Failed to load orders', e);
        setError(e?.response?.data?.message || e.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      <h1>My Orders</h1>

      {loading && <p>Loading orders...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && orders.length === 0 && <p>You have no orders yet.</p>}

      {orders.map(order => (
        <div key={order.orderId} style={{ background: '#fff', padding: '18px', borderRadius: '8px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <strong>Order:</strong> {order.orderId}
              <div style={{ fontSize: '13px', color: '#666' }}>Placed: {new Date(order.createdAt || order.createdAt).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div><strong>Status:</strong> {order.status}</div>
              <div style={{ fontSize: '16px', color: '#2563eb', fontWeight: '700' }}>${Number(order.total ?? 0).toFixed(2)}</div>
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            {Array.isArray(order.items) && order.items.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {order.items.map((it, idx) => (
                  <li key={idx} style={{ marginBottom: '6px' }}>
                    {it.productName ?? it.product?.name ?? `Product ${it.productId ?? it.product?.id}`} x {it.quantity} — ${(Number(it.price ?? it.product?.price ?? 0) * Number(it.quantity || 0)).toFixed(2)}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: '#666' }}>No items recorded for this order.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Orders;
