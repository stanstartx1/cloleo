import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config/api';

export const useUserRealtime = (token, userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [orderUpdates, setOrderUpdates] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!token || !userId) return;

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('📱 [WS USER] Max reconnection attempts reached, stopping reconnection');
      setConnectionError('Unable to connect to WebSocket. Please refresh the page.');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/user?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📱 [WS USER] User global WebSocket connected for user:', userId);
        setIsConnected(true);
        setConnectionError(null);
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
          console.log('User global WebSocket message:', data);

          switch (data.type) {
            case 'order_created':
              setOrderUpdates(prev => [...prev, {
                type: 'order_created',
                order_id: data.order_id,
                order_data: data.order_data,
                timestamp: new Date().toISOString()
              }]);
              break;

            case 'order_status_update':
              console.log('📱 [WS USER] Order status update received:', data.status, data);
              setOrderUpdates(prev => [...prev, {
                type: 'order_status_update',
                order_id: data.order_id,
                status: data.status,
                driver_id: data.driver_id,
                driver_name: data.driver_name,
                vendor_name: data.vendor_name,
                eta_minutes: data.eta_minutes,
                driver_vehicle_type: data.driver_vehicle_type,
                delivery_pin: data.delivery_pin,
                timestamp: data.timestamp,
                order_data: data.order_data
              }]);
              break;

            case 'chat_notification':
              setNotifications(prev => [...prev, {
                type: 'chat',
                message: data.message,
                order_id: data.order_id,
                timestamp: new Date().toISOString()
              }]);
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.log('Unknown user message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing user WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('User global WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log('User global WebSocket closed:', event.code, event.reason);
        setIsConnected(false);

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Auto-reconnect after 10 seconds (unless it was a manual close)
        if (event.code !== 1000) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(10000 * reconnectAttemptsRef.current, 60000); // Exponential backoff, max 60s
          
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            console.log(`📱 [WS USER] Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay/1000}s...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setConnectionError('Unable to connect to WebSocket. Please refresh the page.');
          }
        }
      };
    } catch (error) {
      console.error('Error creating user WebSocket connection:', error);
      setIsConnected(false);
    }
  }, [token, userId]);

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
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const clearOrderUpdates = useCallback(() => {
    setOrderUpdates([]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    notifications,
    orderUpdates,
    clearOrderUpdates,
    clearNotifications,
    connectionError
  };
};