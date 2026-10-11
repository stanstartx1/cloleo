import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../config/api';
import axios from 'axios';

export const useDriverLocation = (orderId, token) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const lastLocationRef = useRef(null);

  // Calculate distance between two coordinates (in meters)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Send location to backend
  const sendLocationToBackend = useCallback(async (location) => {
    if (!token || !orderId) return;

    try {
      console.log('📍 [DRIVER LOCATION] Sending location:', location);
      await axios.post(
        `${API_URL}/delivery/driver/update-location`,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          order_id: orderId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('✅ [DRIVER LOCATION] Location sent successfully');
    } catch (error) {
      console.error('❌ [DRIVER LOCATION] Error sending location:', error);
      setError('Erreur lors de l\'envoi de la position');
    }
  }, [orderId, token]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par ce navigateur');
      return;
    }

    setIsTracking(true);
    setError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        setCurrentLocation(location);
        lastLocationRef.current = location;
        sendLocationToBackend(location);
      },
      (err) => {
        setError(`Erreur de géolocalisation: ${err.message}`);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Watch position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        // Only update if position changed significantly (more than 10 meters)
        if (lastLocationRef.current) {
          const distance = calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            location.latitude,
            location.longitude
          );

          if (distance < 10) {
            console.log('📍 [DRIVER LOCATION] Position changed less than 10m, skipping');
            return;
          }
        }

        setCurrentLocation(location);
        lastLocationRef.current = location;
        sendLocationToBackend(location);
      },
      (err) => {
        console.error('❌ [DRIVER LOCATION] Watch position error:', err);
        setError(`Erreur de suivi: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    // Send location updates every 5 seconds (even if position hasn't changed much)
    updateIntervalRef.current = setInterval(() => {
      if (currentLocation) {
        sendLocationToBackend(currentLocation);
      }
    }, 5000);

    console.log('✅ [DRIVER LOCATION] Tracking started');
  }, [currentLocation, sendLocationToBackend]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setIsTracking(false);
    console.log('🛑 [DRIVER LOCATION] Tracking stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    currentLocation,
    isTracking,
    error,
    startTracking,
    stopTracking
  };
};
