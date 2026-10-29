import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('[vite]')) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event.error?.message || event.message || '');
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('[vite]')) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });

  try {
    registerSW({ immediate: true });
  } catch {
    // Service worker registration optional in non-secure contexts
  }
}

createRoot(document.getElementById('root')!).render(<App />);


