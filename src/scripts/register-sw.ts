/**
 * Service worker registration for PWA support.
 *
 * Registers the service worker on page load for offline caching
 * and installability.
 *
 * @module register-sw
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch((err: unknown) => console.error('Service worker registration failed:', err));
  });
}
