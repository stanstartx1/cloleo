import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = API_URL;

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cloleo_token'));
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('cloleo_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const register = async (name, email, password, role = 'customer', phone = null) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { 
        name, email, password, role, phone 
      });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('cloleo_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur d\'inscription' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('cloleo_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const updateUser = (partialUser) => {
    setUser((prev) => ({ ...(prev || {}), ...(partialUser || {}) }));
  };

  // Axios interceptor for auth
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return () => axios.interceptors.request.eject(interceptor);
  }, [token]);

  // Direct login with token (for driver registration flow)
  const loginWithToken = (newToken, userData = null) => {
    setLoading(true);
    localStorage.setItem('cloleo_token', newToken);
    setToken(newToken);
    if (userData) {
      setUser(userData);
      setLoading(false);
      return;
    }
    fetchUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login: async (emailOrToken, password, userData = null) => {
        // If only one argument is passed, treat it as a token
        if (password === undefined) {
          loginWithToken(emailOrToken, userData);
          return { success: true };
        }
        // Otherwise, normal login
        try {
          const response = await axios.post(`${API}/auth/login`, { email: emailOrToken, password });
          const { token: newToken, user: userData } = response.data;
          
          localStorage.setItem('cloleo_token', newToken);
          setToken(newToken);
          setUser(userData);
          
          return { success: true, user: userData };
        } catch (error) {
          console.error('Login error:', error);
          return { 
            success: false, 
            error: error.response?.data?.detail || 'Erreur de connexion' 
          };
        }
      },
      register,
      logout,
      refreshUser,
      updateUser,
      isAuthenticated: !!user,
      isVendor: user?.role === 'vendor' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
      isDriver: user?.role === 'driver',
      isDropshipper: user?.role === 'dropshipper',
      isEnterprise: user?.role === 'enterprise'
    }}>
      {children}
    </AuthContext.Provider>
  );
};
