import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const data = await getProductById( id);
      setProduct(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }

    try {
      await addItem(product.id, 1);
      alert('Added to cart!');
    } catch (err) {
      alert('Failed to add to cart');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  if (!product) return <div style={{ textAlign: 'center', padding: '40px' }}>Product not found</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <button onClick={() => navigate('/products')} style={{ marginBottom: '20px' }}>← Back to Products</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', background: 'white', padding: '40px', borderRadius: '12px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '12px', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={product.imageUrl || '/placeholder-product.png'} 
            alt={product.name}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
        <div>
          <span style={{ color: '#2563eb', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase' }}>{product.category}</span>
          <h1 style={{ fontSize: '32px', margin: '10px 0' }}>{product.name}</h1>
          <p style={{ fontSize: '28px', color: '#2563eb', fontWeight: 'bold' }}>${parseFloat(product.price).toFixed(2)}</p>
          <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '20px' }}>{product.description}</p>
          <p style={{ marginBottom: '30px' }}>Stock: {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</p>
          <button 
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="btn-primary"
            style={{ padding: '14px 40px', fontSize: '16px' }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;