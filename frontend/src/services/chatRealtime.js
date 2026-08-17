import { WS_URL } from '../config/api';

/**
 * Lightweight, authenticated chat transport with exponential reconnection.
 * REST remains the source of truth; this transport only delivers live events.
 */
export const createChatRealtime = ({ conversationId, token, onEvent, onStatusChange }) => {
  let socket;
  let reconnectTimer;
  let closed = false;
  let attempts = 0;

  const connect = () => {
    if (closed || !conversationId || !token) return;
    socket = new WebSocket(`${WS_URL}/api/ws/chat/${conversationId}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      attempts = 0;
      onStatusChange?.(true);
    };
    socket.onmessage = (event) => {
      try {
        onEvent?.(JSON.parse(event.data));
      } catch (_) {
        // Ignore malformed live events: the REST fallback will recover state.
      }
    };
    socket.onclose = () => {
      onStatusChange?.(false);
      if (closed) return;
      const delay = Math.min(1000 * (2 ** attempts), 15000);
      attempts += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    };
    socket.onerror = () => socket.close();
  };

  connect();
  return () => {
    closed = true;
    window.clearTimeout(reconnectTimer);
    socket?.close();
  };
};

/**
 * Global WebSocket connection for all user events (messages, notifications, etc.)
 * This stays connected even when chat is not open, ensuring users receive messages.
 */
export const createGlobalRealtime = ({ token, onEvent, onStatusChange }) => {
  let socket;
  let reconnectTimer;
  let closed = false;
  let attempts = 0;

  const connect = () => {
    if (closed || !token) return;
    socket = new WebSocket(`${WS_URL}/api/ws/user?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      attempts = 0;
      onStatusChange?.(true);
    };
    socket.onmessage = (event) => {
      try {
        onEvent?.(JSON.parse(event.data));
      } catch (_) {
        // Ignore malformed events
      }
    };
    socket.onclose = () => {
      onStatusChange?.(false);
      if (closed) return;
      const delay = Math.min(1000 * (2 ** attempts), 15000);
      attempts += 1;
      reconnectTimer = window.setTimeout(connect, delay);
    };
    socket.onerror = () => socket.close();
  };

  connect();
  return () => {
    closed = true;
    window.clearTimeout(reconnectTimer);
    socket?.close();
  };
};
