import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config/api';

export const useVendorOrders = (vendorId, token) => {
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const connect = useCallback(() => {
    if (!vendorId || !token) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`${WS_URL}/api/ws/vendor-orders/${vendorId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Vendor orders WebSocket connected');
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
          console.log('Vendor orders WebSocket message:', data);

          switch (data.type) {
            case 'vendor_connected':
              console.log('Vendor connected to orders system');
              break;

            case 'new_order':
              setNewOrderAlert(data.order_data);
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
              console.log('Order status update:', data);
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

        // Auto-reconnect after 5 seconds
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect vendor orders WebSocket...');
            connect();
          }, 5000);
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

  return {
    newOrderAlert,
    connectionStatus,
    error,
    sendMessage,
    clearNewOrderAlert,
    isConnected: connectionStatus === 'connected'
  };
};
