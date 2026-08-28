import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config/api';

export const useOrderTracking = (orderId, token) => {
  const [order, setOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!orderId || !token) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, stopping reconnection');
      setConnectionStatus('error');
      setError('Impossible de se connecter après plusieurs tentatives');
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/order/${orderId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📱 [WS ORDER] Order tracking WebSocket connected for order:', orderId);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection

        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // 30 second heartbeat
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Order tracking WebSocket message:', data);

          switch (data.type) {
            case 'order_connected':
              setOrder(data.order_data);
              break;

            case 'order_created':
              setOrder(data.order_data);
              break;

            case 'order_status_update':
              console.log('📱 [WS ORDER] Status update received:', data.status, data);
              setOrder(prev => ({
                ...prev,
                status: data.status,
                updated_at: data.timestamp,
                ...(data.driver_id && { driver_id: data.driver_id }),
                ...(data.driver_name && { driver_name: data.driver_name }),
                ...(data.driver_vehicle_type && { driver_vehicle_type: data.driver_vehicle_type }),
                ...(data.vendor_name && { vendor_name: data.vendor_name }),
                ...(data.picked_up_at && { picked_up_at: data.picked_up_at }),
                ...(data.in_transit_at && { in_transit_at: data.in_transit_at }),
                ...(data.delivered_at && { delivered_at: data.delivered_at }),
                ...(data.eta_minutes !== undefined && { eta_minutes: data.eta_minutes }),
                ...data.order_data
              }));
              // Update driver location if provided in the status update
              if (data.driver_location) {
                console.log('📱 [WS ORDER] Driver location in status update:', data.driver_location);
                setDriverLocation(data.driver_location);
              }
              // If status is assigned or accepted, we expect driver location to follow
              if (data.status === 'assigned' || data.status === 'accepted') {
                console.log('📱 [WS ORDER] Driver assigned/accepted, expecting location updates');
              }
              break;

            case 'driver_location_update':
              setDriverLocation(data.location);
              break;

            case 'order_assigned':
              setOrder(prev => ({
                ...prev,
                status: data.status || 'assigned',
                driver_id: data.driver_id,
                driver_name: data.order_data?.driver_name,
                driver_vehicle_type: data.order_data?.driver_vehicle_type,
                ...data.order_data
              }));
              // Initialize driver location if available in data or order_data
              if (data.driver_location) {
                console.log('📱 [WS ORDER] Driver location in order_assigned:', data.driver_location);
                setDriverLocation(data.driver_location);
              } else if (data.order_data?.driver_location) {
                console.log('📱 [WS ORDER] Driver location in order_assigned (order_data):', data.order_data.driver_location);
                setDriverLocation(data.order_data.driver_location);
              }
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Order tracking WebSocket error:', error);
        setConnectionStatus('error');
        setError('Erreur de connexion WebSocket');
      };

      ws.onclose = (event) => {
        console.log('Order tracking WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Auto-reconnect with exponential backoff (unless it was a manual close)
        if (event.code !== 1000) {
          reconnectAttemptsRef.current++;
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30 seconds
          
          console.log(`Attempting to reconnect order tracking WebSocket in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffTime);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('error');
      setError('Erreur de création de connexion WebSocket');
    }
  }, [orderId, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal close
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0; // Reset reconnect attempts
    setConnectionStatus('disconnected');
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    order,
    driverLocation,
    connectionStatus,
    error,
    sendMessage,
    isConnected: connectionStatus === 'connected'
  };
};