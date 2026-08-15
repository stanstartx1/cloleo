/**
 * ForumWebSocketService - Service for real-time forum updates via WebSocket
 * Handles connection, typing indicators, presence, and real-time notifications
 */

class ForumWebSocketService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = new Map();
    this.currentTopicId = null;
    this.userId = null;
    this.token = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} topicId - Topic ID to subscribe to
   * @param {string} token - Authentication token
   * @param {string} userId - User ID
   */
  connect(topicId, token, userId) {
    if (this.ws && this.connected) {
      this.disconnect();
    }

    this.currentTopicId = topicId;
    this.token = token;
    this.userId = userId;

    const wsUrl = `${process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com'
      .replace('http://', 'ws://')
      .replace('https://', 'wss://')}/forum/ws/forum/${topicId}?token=${token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Forum WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.stopPingInterval();
      this.emit('disconnected');
      this.attemptReconnect();
    };
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.stopPingInterval();
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    setTimeout(() => {
      if (this.currentTopicId && this.token && this.userId) {
        this.connect(this.currentTopicId, this.token, this.userId);
      }
    }, delay);
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} data - Message data
   */
  handleMessage(data) {
    const { type } = data;

    switch (type) {
      case 'new_comment':
        this.emit('newComment', data);
        break;
      case 'topic_updated':
        this.emit('topicUpdated', data);
        break;
      case 'typing':
        this.emit('typing', data);
        break;
      case 'typing_stopped':
        this.emit('typingStopped', data);
        break;
      case 'user_joined':
        this.emit('userJoined', data);
        break;
      case 'user_left':
        this.emit('userLeft', data);
        break;
      case 'presence_update':
        this.emit('presenceUpdate', data);
        break;
      case 'notification':
        this.emit('notification', data);
        break;
      case 'pong':
        // Pong received, keep-alive
        break;
      default:
        console.log('Unknown message type:', type);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping() {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'typing' }));
    }
  }

  /**
   * Subscribe to additional topic
   * @param {string} topicId - Topic ID to subscribe to
   */
  subscribeToTopic(topicId) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'subscribe', topic_id }));
    }
  }

  /**
   * Unsubscribe from topic
   * @param {string} topicId - Topic ID to unsubscribe from
   */
  unsubscribeFromTopic(topicId) {
    if (this.connected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', topic_id }));
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  startPingInterval() {
    this.pingInterval = setInterval(() => {
      if (this.connected && this.ws) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export const forumWebSocket = new ForumWebSocketService();
