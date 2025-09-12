import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PushService } from './services/pushService';

// Register service worker and initialize push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await PushService.registerServiceWorker();
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
