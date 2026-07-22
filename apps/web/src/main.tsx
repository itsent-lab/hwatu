import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/app.css';
import './styles/gameHub.css';
import './styles/gameStatistics.css';
import './styles/gostopRoom.css';
import './styles/game.css';
import './styles/fiveGoCelebration.css';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    void Promise.all([
      navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(
        registrations.map(registration => registration.unregister())
      )),
      'caches' in window
        ? caches.keys().then(keys => Promise.all(
          keys.filter(key => key.startsWith('nsj-hwatu-shell-')).map(key => caches.delete(key))
        ))
        : Promise.resolve([])
    ]).then(() => {
      if (wasControlled) window.location.reload();
    }).catch(() => undefined);
  });
} else if ('serviceWorker' in navigator && window.isSecureContext) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js?v=9', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(() => undefined);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>
);
