import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }
  return supabase
}

export async function saveQuote(userId, quoteInput) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('remittance_quotes')
    .insert({
      user_id: userId,
      recipient_name: quoteInput.recipientName,
      recipient_phone: quoteInput.recipientPhone,
      amount_npr: quoteInput.amountNpr,
      fee_npr: quoteInput.feeNpr,
      fx_rate: quoteInput.fxRate,
      provider: quoteInput.provider,
      delivery_method: quoteInput.method,
      locked_until: quoteInput.lockedUntil,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save quote: ${error.message}`)
  }

  return data
}
