import posthog from 'posthog-js'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY?.trim()
const posthogHost = import.meta.env.VITE_POSTHOG_HOST?.trim() || 'https://app.posthog.com'

let initialized = false

export function hasPostHogConfig() {
  return Boolean(posthogKey)
}

export function initPostHog() {
  if (initialized || typeof window === 'undefined' || !posthogKey) {
    return posthogKey ? posthog : null
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    person_profiles: 'identified_only',
  })

  initialized = true
  return posthog
}

export function getPostHogClient() {
  return initPostHog()
}
