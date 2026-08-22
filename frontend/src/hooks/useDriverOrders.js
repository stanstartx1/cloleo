import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config/api';

export const useDriverOrders = (driverId, token) => {
  const [orders, setOrders] = useState([]);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!driverId || !token) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/driver-orders/${driverId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📱 [WS DRIVER] Driver orders WebSocket connected for driver:', driverId);
        setConnectionStatus('connected');
        setError(null);

        // Start heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📱 [WS DRIVER] Message received:', data.type, data);

          switch (data.type) {
            case 'driver_connected':
              console.log('📱 [WS DRIVER] Driver connected to orders system');
              break;

            case 'new_order':
              console.log('📱 [WS DRIVER] New order assigned:', data.order_data);
              setNewOrderAlert(data.order_data);
              // Show notification sound
              try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => {});
              } catch (error) {
                console.log('Could not play notification sound');
              }
              break;

            case 'order_assigned':
              console.log('📱 [WS DRIVER] Order assigned:', data.order_id, data.order_data);
              // Update order in the list
              setOrders(prev => {
                const existingIndex = prev.findIndex(o => o.id === data.order_id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = data.order_data;
                  return updated;
                }
                return [...prev, data.order_data];
              });
              break;

            case 'order_status_update':
              console.log('📱 [WS DRIVER] Order status update:', data.order_id, data.status);
              // Update order status
              setOrders(prev => {
                const existingIndex = prev.findIndex(o => o.id === data.order_id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    status: data.status,
                    updated_at: data.timestamp,
                    ...(data.driver_name && { driver_name: data.driver_name }),
                    ...(data.picked_up_at && { picked_up_at: data.picked_up_at }),
                    ...(data.in_transit_at && { in_transit_at: data.in_transit_at }),
                    ...(data.delivered_at && { delivered_at: data.delivered_at }),
                    ...(data.eta_minutes !== undefined && { eta_minutes: data.eta_minutes }),
                    ...data.order_data
                  };
                  return updated;
                }
                return prev;
              });
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.log('📱 [WS DRIVER] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('📱 [WS DRIVER] Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Driver orders WebSocket error:', error);
        setConnectionStatus('error');
        setError('Erreur de connexion WebSocket');
      };

      ws.onclose = (event) => {
        console.log('Driver orders WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Auto-reconnect after 5 seconds
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect driver orders WebSocket...');
            connect();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionStatus('error');
      setError('Erreur de création de connexion WebSocket');
    }
  }, [driverId, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
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

  const sendLocationUpdate = useCallback((location) => {
    sendMessage({
      type: 'location_update',
      location: location
    });
  }, [sendMessage]);

  const clearNewOrderAlert = useCallback(() => {
    setNewOrderAlert(null);
  }, []);

  return {
    orders,
    newOrderAlert,
    connectionStatus,
    error,
    sendMessage,
    sendLocationUpdate,
    clearNewOrderAlert,
    isConnected: connectionStatus === 'connected'
  };
};