import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister any stale service workers in dev to prevent caching stale React/JS chunks
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
  // Also clear all caches to force fresh JS load
  if (window.caches) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}

// Block BarcodeDetector so html5-qrcode (if cached) does not crash the app.
// We use jsQR exclusively for QR scanning.
if (typeof window !== 'undefined') {
  window.BarcodeDetector = undefined;
  // Override getSupportedFormats to safely return empty array
  try {
    Object.defineProperty(window, 'BarcodeDetector', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  } catch (_) {}
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)