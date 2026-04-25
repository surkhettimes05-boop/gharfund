import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

export async function getLatestConfirmedTransfer(userId) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('transfers')
    .select('id, amount_npr, transfer_date')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function createConfirmedTransfer(userId, transferInput) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('transfers')
    .insert({
      user_id: userId,
      amount_npr: transferInput.amount_npr,
      transfer_date: transferInput.transfer_date,
      method: transferInput.method,
      recipient_type: transferInput.recipient_type,
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .select('id, amount_npr, transfer_date')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getUserTransfers(userId) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('transfers')
    .select(
      'id, amount_npr, transfer_date, method, confirmed, acknowledged_by_family, created_at',
    )
    .eq('user_id', userId)
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export async function getConfirmedTransfersForYear(userId, year) {
  const client = getSupabaseRequired()
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`
  const { data, error } = await client
    .from('transfers')
    .select('id, amount_npr, transfer_date, method, confirmed, created_at')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .gte('transfer_date', dateFrom)
    .lte('transfer_date', dateTo)
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export function hasTransferThisMonth(transferDate) {
  if (!transferDate) {
    return false
  }

  const today = new Date()
  const transfer = new Date(`${transferDate}T00:00:00`)

  return (
    transfer.getUTCFullYear() === today.getUTCFullYear() &&
    transfer.getUTCMonth() === today.getUTCMonth()
  )
}
