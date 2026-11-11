self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Wajib ada agar Chrome Android memunculkan "Instal Aplikasi" (Bukan Pintasan)
self.addEventListener('fetch', (e) => {});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      if (clientsArr.length > 0) {
        let client = clientsArr[0];
        for (let i = 0; i < clientsArr.length; i++) {
          if (clientsArr[i].focused) client = clientsArr[i];
        }
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});