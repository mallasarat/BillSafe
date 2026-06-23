// =============================================
//  SERVICE WORKER — BillSafe
//  Enables offline support + background nudges
// =============================================

const CACHE_NAME = 'billsafe-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/retailers.js', '/gst-parser.js', '/notifications.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Handle push notifications from background
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'BillSafe', body: 'Check your return deadlines!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png',
      badge: '/icon.png',
      requireInteraction: true,
      tag: data.tag || 'billsafe-nudge',
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
