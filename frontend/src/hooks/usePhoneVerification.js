import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API = API_URL;

export const usePhoneVerification = () => {
  const { loginWithToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  // Timer pour le countdown
  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const sendCode = useCallback(async (phoneNumber) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API}/auth/send-verification-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de l\'envoi du code');
      }

      toast.success(data.message || 'Code de vérification envoyé !');
      
      // Démarrer le countdown (60 secondes)
      setCountdown(60);
      setCanResend(false);
      
      return { success: true, code: data.code }; // data.code est pour le développement
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyCodeRegister = useCallback(async (phoneNumber, code, password, name, role, email = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API}/auth/verify-phone-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          verification_code: code,
          password,
          name,
          role,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la vérification');
      }

      toast.success('Compte créé avec succès ! 🎉');
      
      // Utiliser loginWithToken du AuthContext pour connecter l'utilisateur
      loginWithToken(data.token, data.user);
      
      return { success: true, token: data.token, user: data.user };
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [loginWithToken]);

  const verifyCodeLogin = useCallback(async (phoneNumber, code) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API}/auth/verify-phone-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          verification_code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la connexion');
      }

      toast.success('Connexion réussie ! 🎉');
      
      // Utiliser loginWithToken du AuthContext pour connecter l'utilisateur
      loginWithToken(data.token, data.user);
      
      return { success: true, token: data.token, user: data.user };
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [loginWithToken]);

  const resendCode = useCallback(async (phoneNumber) => {
    if (!canResend) {
      toast.error(`Veuillez attendre ${countdown} secondes avant de renvoyer`);
      return { success: false };
    }

    return sendCode(phoneNumber);
  }, [canResend, countdown, sendCode]);

  return {
    sendCode,
    verifyCodeRegister,
    verifyCodeLogin,
    resendCode,
    loading,
    error,
    countdown,
    canResend,
  };
};
