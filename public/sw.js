const CACHE_VERSION = 'v3'
const SHELL_CACHE = `sansarpay-shell-${CACHE_VERSION}`
const ASSET_CACHE = `sansarpay-assets-${CACHE_VERSION}`
const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']
const SHELL_FALLBACK_URL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname === '/manifest.json' || url.pathname.startsWith('/icons/'))
  ) {
    event.respondWith(cacheFirstShellResource(request))
    return
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(request))
  }
})

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch {
    return Response.error()
  }
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE)

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      await cache.put(SHELL_FALLBACK_URL, networkResponse.clone())
    }

    return networkResponse
  } catch {
    return (await cache.match(SHELL_FALLBACK_URL)) || (await cache.match('/'))
  }
}

async function cacheFirstShellResource(request) {
  const cache = await caches.open(SHELL_CACHE)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch {
    return Response.error()
  }
}

async function precacheShell() {
  const shellCache = await caches.open(SHELL_CACHE)
  await shellCache.addAll(SHELL_URLS)

  const assetCache = await caches.open(ASSET_CACHE)
  const assetUrls = await getBuildAssetUrls()

  await Promise.all(
    assetUrls.map(async (assetUrl) => {
      try {
        const response = await fetch(assetUrl, { cache: 'no-store' })

        if (response.ok) {
          await assetCache.put(assetUrl, response.clone())
        }
      } catch {
        // Ignore install-time asset fetch failures and rely on runtime caching.
      }
    }),
  )
}

async function getBuildAssetUrls() {
  try {
    const response = await fetch('/index.html', { cache: 'no-store' })

    if (!response.ok) {
      return []
    }

    const html = await response.text()
    const assetMatches = html.match(/\/assets\/[^"'<>\\s)]+/g) || []

    return [...new Set(assetMatches)]
  } catch {
    return []
  }
}
