const CACHE = 'mh-tarabah-pwa-v5';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./index.html','./manifest.json','./app-icon.png','./auth/navigation.js','./auth/progress.js','./auth/firebase.js','./auth/firebase-config.js'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('mh-tarabah-pwa-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
 const u = new URL(e.request.url);
 if(e.request.method !== 'GET' || u.origin !== self.location.origin || !u.href.startsWith(self.registration.scope)) return;
 e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r => {
 if(r.ok && r.type === 'basic' && !e.request.headers.has('range') && r.status === 200 && /\.(html|json|js|css|png|svg|webp|jpg)$/.test(u.pathname)) { const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); }
 return r;
 }).catch(async () => (await caches.match(e.request)) || (e.request.mode === 'navigate' ? await caches.match('./index.html') : null) || new Response('Offline',{status:503})));
});