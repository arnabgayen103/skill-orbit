// Basic Service Worker for PWA Installation
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
    // Leave empty for now, just needed to pass PWA criteria
});