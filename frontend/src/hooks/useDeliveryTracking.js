import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/api';
import axios from 'axios';

export const useDeliveryTracking = (orderId, token) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const fetchTrackingData = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/delivery/tracking/${orderId}`, { headers });
      console.log('📍 [DELIVERY TRACKING] Tracking data fetched:', response.data);
      setTrackingData(response.data);
      setError(null);
    } catch (err) {
      console.error('❌ [DELIVERY TRACKING] Error fetching tracking data:', err);
      setError('Erreur lors du chargement du suivi');
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  // Initial fetch
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // Set up auto-refresh every 3 seconds (faster for better real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTrackingData();
    }, 3000);

    setRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchTrackingData]);

  // Refresh tracking data manually
  const refresh = useCallback(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  return {
    trackingData,
    loading,
    error,
    refresh,
    route: trackingData?.route,
    progress: trackingData?.progress,
    driverLocation: trackingData?.driver_location,
    destination: trackingData?.destination,
    status: trackingData?.status
  };
};
