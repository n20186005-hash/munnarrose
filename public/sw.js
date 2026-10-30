// Retire this site's former offline cache; do not cache dynamic weather or error pages.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k==='munnarrose-v1').map(k=>caches.delete(k)))).then(()=>self.registration.unregister()).then(()=>self.clients.claim())));
