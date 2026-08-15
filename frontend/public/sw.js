/* Cloléo Service Worker - Web Push Notifications */
self.addEventListener('push', (event) => {
  let data = { title: 'Cloléo', body: 'Nouvelle notification' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Cloléo', {
      body: data.body || '',
      icon: '/logo192.png',
      badge: '/badge72.png',
      data: data.data || {},
      tag: data.tag || 'cloleo-notification',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
