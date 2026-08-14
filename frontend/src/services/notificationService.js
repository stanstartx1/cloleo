// Web Push Notification Service
// Handles browser notifications for real-time updates

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.subscription = null;
    this.swRegistration = null;
  }

  // Initialize notification service
  async init() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    this.permission = Notification.permission;

    if (this.permission === 'granted') {
      await this.subscribeToPush();
    }

    return true;
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      this.permission = await Notification.requestPermission();
      
      if (this.permission === 'granted') {
        await this.subscribeToPush();
        return true;
      }
    }

    return false;
  }

  // Subscribe to push notifications
  async subscribeToPush() {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      // Register service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      
      // Subscribe to push
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY)
      });

      this.subscription = subscription;
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return null;
    }
  }

  // Send subscription to backend
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subscription: subscription,
          user_agent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending subscription:', error);
      return null;
    }
  }

  // Show local notification
  showNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      icon: '/logo192.png',
      badge: '/badge72.png',
      ...options
    });

    notification.onclick = () => {
      notification.close();
      if (options.onClick) {
        options.onClick();
      }
    };

    return notification;
  }

  // Show order notification
  showOrderNotification(orderData) {
    const { order_number, status, message } = orderData;
    
    const statusMessages = {
      assigned: 'Un livreur a été assigné à votre commande',
      accepted: 'Le livreur a accepté votre commande',
      picked_up: 'Le livreur a récupéré votre colis',
      in_transit: 'Le livreur est en route vers vous',
      delivered: 'Votre commande a été livrée',
      cancelled: 'Votre commande a été annulée'
    };

    this.showNotification(`Commande ${order_number}`, {
      body: message || statusMessages[status] || 'Mise à jour de votre commande',
      tag: `order-${order_number}`,
      requireInteraction: true,
      onClick: () => {
        window.location.href = `/suivi/${orderData.order_id}`;
      }
    });
  }

  // Show chat notification
  showChatNotification(chatData) {
    const { sender_name, message, order_id } = chatData;
    
    this.showNotification(`Nouveau message de ${sender_name}`, {
      body: message,
      tag: `chat-${order_id}`,
      onClick: () => {
        // Open chat for this order
        window.dispatchEvent(new CustomEvent('openChat', { detail: chatData }));
      }
    });
  }

  // Show driver notification
  showDriverNotification(notificationData) {
    const { type, message, order_id } = notificationData;
    
    this.showNotification('Notification livreur', {
      body: message,
      tag: `driver-${type}`,
      requireInteraction: true,
      onClick: () => {
        window.location.href = '/livreur';
      }
    });
  }

  // Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  // Unsubscribe from notifications
  async unsubscribe() {
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        this.subscription = null;
        
        // Notify server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    }
  }

  // Get current permission status
  getPermission() {
    return this.permission;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export hook for React components
export const useNotifications = () => {
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    notificationService.init().then(() => {
      setPermission(notificationService.getPermission());
    });
  }, []);

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  };

  const showNotification = (title, options) => {
    return notificationService.showNotification(title, options);
  };

  return {
    permission,
    requestPermission,
    showNotification,
    service: notificationService
  };
};

export default notificationService;