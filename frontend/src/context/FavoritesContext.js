import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = API_URL;

const getSessionId = () => {
  let sessionId = localStorage.getItem('cloleo_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('cloleo_session_id', sessionId);
  }
  return sessionId;
};

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const sessionId = getSessionId();

  const fetchFavorites = useCallback(async () => {
    try {
      if (isAuthenticated && token) {
        // Use user favorites endpoint
        const response = await axios.get(`${API}/user/favorites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(response.data.favorites || []);
      } else {
        // Fall back to session-based favorites
        const response = await axios.get(`${API}/favorites/${sessionId}`);
        setFavorites(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
    }
  }, [sessionId, isAuthenticated, token]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addToFavorites = async (productId) => {
    setLoading(true);
    try {
      if (isAuthenticated && token) {
        await axios.post(`${API}/user/favorites/${productId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API}/favorites/${sessionId}/${productId}`);
      }
      await fetchFavorites();
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (productId) => {
    setLoading(true);
    try {
      if (isAuthenticated && token) {
        await axios.delete(`${API}/user/favorites/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.delete(`${API}/favorites/${sessionId}/${productId}`);
      }
      await fetchFavorites();
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (productId) => {
    return favorites.some(p => p.id === productId);
  };

  const toggleFavorite = async (productId) => {
    if (isFavorite(productId)) {
      return await removeFromFavorites(productId);
    } else {
      return await addToFavorites(productId);
    }
  };

  const getFavoritesCount = () => favorites.length;

  return (
    <FavoritesContext.Provider value={{
      favorites,
      loading,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      toggleFavorite,
      fetchFavorites,
      getFavoritesCount
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};
