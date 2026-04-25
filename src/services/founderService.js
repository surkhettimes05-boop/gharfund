import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

function unwrapRpcResult(data) {
  if (data == null) {
    return null
  }

  if (Array.isArray(data)) {
    return data[0] || null
  }

  return data
}

export async function getFounderDashboardSummary() {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_founder_dashboard_summary')

  if (error) {
    throw error
  }

  return unwrapRpcResult(data)
}

export async function getFounderRecentUsers() {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_founder_recent_users')

  if (error) {
    throw error
  }

  return data || []
}

export async function getFounderRecentTransfers() {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_founder_recent_transfers')

  if (error) {
    throw error
  }

  return data || []
}
