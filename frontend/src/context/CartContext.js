import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = API_URL;

// Generate or get session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('cloleo_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('cloleo_session_id', sessionId);
  }
  return sessionId;
};

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total_fcfa: 0, total_usd: 0, item_count: 0 });
  const [loading, setLoading] = useState(false);
  const sessionId = getSessionId();

  const fetchCart = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/cart/${sessionId}`);
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1, selectedAttributes = {}) => {
    setLoading(true);
    try {
      await axios.post(`${API}/cart/add`, {
        product_id: productId,
        quantity,
        session_id: sessionId,
        selected_attributes: selectedAttributes
      });
      await fetchCart();
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    setLoading(true);
    try {
      if (quantity <= 0) {
        await axios.delete(`${API}/cart/${sessionId}/${itemId}`);
      } else {
        await axios.put(`${API}/cart/${sessionId}/${itemId}`, { quantity });
      }
      await fetchCart();
    } catch (error) {
      console.error('Error updating cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId) => {
    setLoading(true);
    try {
      await axios.delete(`${API}/cart/${sessionId}/${itemId}`);
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      await axios.delete(`${API}/cart/${sessionId}`);
      await fetchCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      fetchCart,
      sessionId
    }}>
      {children}
    </CartContext.Provider>
  );
};
