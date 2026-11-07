// Speichert das ganze Spiel auf dem Gerät → läuft danach ohne Internet.
const VERSION = 'blackace-2';
const DATEIEN = ['./', 'index.html', 'stil.css', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png',
  'js/app.js', 'js/ansicht.js', 'js/intro.js', 'js/tischui.js', 'js/tisch.js', 'js/bot.js', 'js/bewertung.js', 'js/karten.js', 'js/daten.js', 'js/ton.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== VERSION).map((n) => caches.delete(n)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((treffer) => treffer || fetch(e.request)));
});
