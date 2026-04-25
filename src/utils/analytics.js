import { getPostHogClient } from '../lib/posthog.js'
import { getStoredSession } from '../lib/session.js'

function getSessionContext(sessionOverride) {
  return sessionOverride || getStoredSession() || null
}

function buildSharedProperties(context = {}) {
  const session = getSessionContext(context.session)

  const properties = {
    ...context.properties,
    user_id: context.user_id ?? session?.supabaseUserId ?? undefined,
    working_location:
      context.working_location ?? session?.workingLocation ?? undefined,
    language: context.language ?? session?.languagePreference ?? 'ne',
    timestamp: new Date().toISOString(),
  }

  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  )
}

export function identifyUserForAnalytics(context = {}) {
  try {
    const client = getPostHogClient()

    if (!client) {
      return
    }

    const session = getSessionContext(context.session)
    const distinctId = context.user_id ?? session?.supabaseUserId

    if (!distinctId) {
      return
    }

    const personProperties = Object.fromEntries(
      Object.entries({
        working_location:
          context.working_location ?? session?.workingLocation ?? undefined,
        language: context.language ?? session?.languagePreference ?? 'ne',
      }).filter(([, value]) => value !== undefined),
    )

    client.identify(String(distinctId), personProperties)
  } catch {
    // Analytics must never block product flows.
  }
}

export function trackEvent(eventName, context = {}) {
  try {
    const client = getPostHogClient()

    if (!client) {
      return
    }

    identifyUserForAnalytics(context)
    client.capture(eventName, buildSharedProperties(context))
  } catch {
    // Analytics must never block product flows.
  }
}

export function trackFeedbackClicked(source, context = {}) {
  trackEvent('feedback_clicked', {
    ...context,
    properties: {
      ...context.properties,
      source,
    },
  })
}
