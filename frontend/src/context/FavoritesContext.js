import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getSessionId = () => {
  return localStorage.getItem('cloleo_session_id') || 'sess_' + Math.random().toString(36).substring(2, 15);
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
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const sessionId = getSessionId();

  const fetchFavorites = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/favorites/${sessionId}`);
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addToFavorites = async (productId) => {
    setLoading(true);
    try {
      await axios.post(`${API}/favorites/${sessionId}/${productId}`);
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
      await axios.delete(`${API}/favorites/${sessionId}/${productId}`);
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

  return (
    <FavoritesContext.Provider value={{
      favorites,
      loading,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      toggleFavorite,
      fetchFavorites
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};
