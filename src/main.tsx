// MUST stay the first import: moves saved keys from the old name to "pta-qms:"
// before any zustand store module reads localStorage.
import './lib/migrateStorageKeys'
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import { useThemeStore, applyTheme, watchSystemTheme } from './store/useThemeStore'
import App from './App.tsx'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { bootRecover, markScriptLoaded } from './lib/bootRecovery'

// The bundle is running, so whatever else goes wrong, this deployment is not
// the kind that fails to download at all.
markScriptLoaded();

// Vite could not fetch a preloaded chunk — almost always a stale HTML shell left
// over from a previous deployment. Hand it to the shared recovery budget in
// index.html: it purges caches and reloads at most twice, then shows a real
// message. Reloading unconditionally here is what produced an infinite loop.
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[boot] Vite preload error — attempting chunk recovery.', event);
  bootRecover('vite-preload-error');
});

// Initialize theme from persisted state. A corrupt persisted value must never
// stop the app from mounting.
try {
  applyTheme(useThemeStore.getState().theme);
  watchSystemTheme();
} catch (error) {
  console.warn('[boot] Could not read persisted theme; falling back to the default.', error);
}

// Service worker management:
// In production, register the service worker for PWA caching.
// In development, actively unregister all existing service workers and purge caches
// so stale cache-first assets never poison HMR or development reload cycles.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      // updateViaCache: 'none' keeps the browser from serving sw.js itself out of
      // the HTTP cache, which would pin an old caching strategy in place forever.
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
        // SW registration failed — non-critical
      });
    });
  } else {
    // Development mode: unregister and purge caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-surface-secondary flex items-center justify-center"><div className="text-text-tertiary">Loading...</div></div>}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
