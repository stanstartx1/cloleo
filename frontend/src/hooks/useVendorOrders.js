import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config/api';

export const useVendorOrders = (vendorId, token) => {
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [orders, setOrders] = useState([]); // Add orders state for real-time updates
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!vendorId || !token) return;

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('📱 [WS VENDOR] Max reconnect attempts reached, stopping reconnection');
      setConnectionStatus('error');
      setError('Impossible de se connecter après plusieurs tentatives');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/vendor-orders/${vendorId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📱 [WS VENDOR] Vendor orders WebSocket connected for vendor:', vendorId);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection

        // Start heartbeat with faster interval for better real-time performance
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 10000); // 10 second heartbeat (reduced from 30s for faster reconnection)
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📱 [WS VENDOR] Message received:', data.type, data);
          console.log('📱 [WS VENDOR] Full message data:', JSON.stringify(data, null, 2));

          switch (data.type) {
            case 'vendor_connected':
              console.log('Vendor connected to orders system');
              break;

            case 'new_order':
              console.log('📱 [WS VENDOR] New order received:', data.order_data);
              setNewOrderAlert(data.order_data);
              
              // Immediately add the new order to the list for real-time update
              if (data.order_data) {
                setOrders(prev => {
                  // Check if order already exists to avoid duplicates
                  const exists = prev.some(o => o.id === data.order_data.id);
                  if (!exists) {
                    console.log('📱 [WS VENDOR] Adding new order to list:', data.order_data.id);
                    return [data.order_data, ...prev];
                  }
                  return prev;
                });
              }
              
              // Show notification sound
              try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => {});
              } catch (error) {
                console.log('Could not play notification sound');
              }
              break;

            case 'order_status_update':
              // Order status updated (e.g., confirmed, assigned, etc.)
              console.log('📱 [WS VENDOR] Order status update:', data);
              // Handle vehicle type updates if present
              if (data.driver_vehicle_type) {
                console.log('📱 [WS VENDOR] Driver vehicle type updated:', data.driver_vehicle_type);
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
        console.error('Vendor orders WebSocket error:', error);
        setConnectionStatus('error');
        setError('Erreur de connexion WebSocket');
      };

      ws.onclose = (event) => {
        console.log('Vendor orders WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Auto-reconnect with faster exponential backoff
        if (event.code !== 1000) {
          reconnectAttemptsRef.current++;
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // Max 10 seconds
          
          console.log(`📱 [WS VENDOR] Attempting to reconnect in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
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
  }, [vendorId, token]);

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

  const clearNewOrderAlert = useCallback(() => {
    setNewOrderAlert(null);
  }, []);

  const addOrder = useCallback((order) => {
    setOrders(prev => {
      // Check if order already exists to avoid duplicates
      const exists = prev.some(o => o.id === order.id);
      if (!exists) {
        console.log('📱 [WS VENDOR] Adding new order to list:', order.id);
        return [order, ...prev];
      }
      return prev;
    });
  }, []);

  return {
    newOrderAlert,
    orders, // Expose orders for real-time updates
    connectionStatus,
    error,
    sendMessage,
    clearNewOrderAlert,
    addOrder, // Expose addOrder for manual order addition
    isConnected: connectionStatus === 'connected'
  };
};
