import { supabase } from '../lib/supabase.js'
import { getCurrentYear } from '../utils/date.js'
import { sumAmounts } from '../utils/money.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

function unwrapRpcRow(data) {
  return Array.isArray(data) ? data[0] || null : data
}

export async function getFamilyHome(token) {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_family_dashboard', { target_token: token })

  if (error) {
    throw error
  }

  return unwrapRpcRow(data)
}

export async function acknowledgeLatestFamilyTransfer(token) {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('acknowledge_family_transfer', { target_token: token })

  if (error) {
    throw error
  }

  return unwrapRpcRow(data)
}

export async function getFamilyHistory(token) {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_family_history', { target_token: token })

  if (error) {
    throw error
  }

  const transfers = data || []
  const currentYear = getCurrentYear()
  const yearlyTotal = sumAmounts(
    transfers.filter((transfer) => transfer.transfer_date?.startsWith(`${currentYear}-`)),
    'amount_npr',
  )

  return {
    workerName: transfers[0]?.worker_name || '',
    yearlyTotal,
    transfers,
  }
}

export async function getFamilyGoalDetail(token) {
  const client = getSupabaseRequired()
  const { data, error } = await client.rpc('get_family_goal_detail', { target_token: token })

  if (error) {
    throw error
  }

  return unwrapRpcRow(data)
}
