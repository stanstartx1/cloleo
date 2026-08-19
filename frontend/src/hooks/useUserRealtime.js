import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config/api';

export const useUserRealtime = (token, userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [orderUpdates, setOrderUpdates] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!token || !userId) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/user?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('User global WebSocket connected');
        setIsConnected(true);

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
              setOrderUpdates(prev => [...prev, {
                type: 'order_status_update',
                order_id: data.order_id,
                status: data.status,
                driver_id: data.driver_id,
                driver_name: data.driver_name,
                vendor_name: data.vendor_name,
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
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect user global WebSocket...');
            connect();
          }, 10000);
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
    clearNotifications
  };
};