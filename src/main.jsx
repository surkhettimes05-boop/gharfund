import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'

const lazyRouteImporters = [
  () => import('./screens/Goals.jsx'),
  () => import('./screens/Streak.jsx'),
  () => import('./screens/family/FamilyHome.jsx'),
  () => import('./screens/family/FamilyHistory.jsx'),
  () => import('./screens/family/FamilyGoal.jsx'),
]

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      registration.update().catch(() => {})
      navigator.serviceWorker.ready
        .then(async () => {
          await waitForServiceWorkerControl()
          scheduleChunkWarmup()
        })
        .catch(() => {})
    })
    .catch((error) => {
      console.error('Service worker registration failed', error)
    })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

function scheduleChunkWarmup() {
  const warmChunks = () => {
    Promise.allSettled(lazyRouteImporters.map((loadChunk) => loadChunk())).catch(() => {})
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warmChunks, { timeout: 2000 })
    return
  }

  window.setTimeout(warmChunks, 0)
}

function waitForServiceWorkerControl() {
  if (navigator.serviceWorker.controller) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const finish = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', finish)
      resolve()
    }

    navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true })
  })
}
