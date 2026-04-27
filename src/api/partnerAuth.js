/**
 * Partner API Authentication & Authorization
 * 
 * Manages partner API keys and their permissions.
 * In production, this would query an authorized_partners table from Supabase.
 * 
 * For now, this file provides:
 * - API key format validation
 * - Partner permission checking
 * - Rate limiting setup (future)
 */

import { supabase } from '../lib/supabase.js'

/**
 * Validate partner API key format
 */
export function isValidApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false
  // Format: partner_<timestamp>_<random>
  return apiKey.startsWith('partner_') && apiKey.length >= 20
}

/**
 * Verify partner API key against authorized partners
 * 
 * TODO: Implement actual partner verification against authorized_partners table
 * 
 * Expected authorized_partners table schema:
 * - id uuid primary key
 * - api_key text unique
 * - partner_name text
 * - permissions json (array of allowed endpoints)
 * - rate_limit_requests integer
 * - rate_limit_window integer (seconds)
 * - is_active boolean
 * - created_at timestamptz
 * - last_used_at timestamptz
 */
export async function verifyPartnerApiKey(apiKey, endpoint = null) {
  if (!isValidApiKeyFormat(apiKey)) {
    throw new Error('Invalid API key format.')
  }

  // For MVP: Accept any valid format starting with 'partner_'
  // In production, would query authorized_partners table:
  /*
  const { data, error } = await supabase
    .from('authorized_partners')
    .select('id, partner_name, permissions, is_active')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('Invalid or inactive API key.')
  }

  if (endpoint && !data.permissions?.includes(endpoint)) {
    throw new Error('This API key does not have access to this endpoint.')
  }

  // Update last_used_at
  await supabase
    .from('authorized_partners')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return data
  */

  return {
    partner_name: 'MVP Partner',
    permissions: ['transfers', 'scores', 'vaults', 'health'],
  }
}

/**
 * Check if partner has permission for endpoint
 */
export async function hasPermission(apiKey, endpoint) {
  try {
    const partner = await verifyPartnerApiKey(apiKey)
    return partner.permissions?.includes(endpoint) || false
  } catch {
    return false
  }
}

/**
 * Generate a new partner API key
 * This would be called during partner onboarding
 */
export function generatePartnerApiKey() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `partner_${timestamp}_${random}`
}

/**
 * Sanitize response data to prevent accidental information leakage
 */
export function sanitizePartnerResponse(data) {
  // Ensure no personal identifiable information in response
  const sanitized = JSON.parse(JSON.stringify(data))

  // Remove any fields that might contain PII
  const recursiveClean = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(recursiveClean)
    }
    if (obj !== null && typeof obj === 'object') {
      const cleaned = {}
      for (const [key, value] of Object.entries(obj)) {
        // Exclude fields that might contain personal data
        if (
          !['user_id', 'id', 'firebase_uid', 'phone', 'email', 'name'].includes(key)
        ) {
          cleaned[key] = recursiveClean(value)
        }
      }
      return cleaned
    }
    return obj
  }

  return recursiveClean(sanitized)
}

export default {
  isValidApiKeyFormat,
  verifyPartnerApiKey,
  hasPermission,
  generatePartnerApiKey,
  sanitizePartnerResponse,
}
