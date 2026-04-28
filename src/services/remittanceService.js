import { supabase } from '../lib/supabase.js'
import { checkStatus } from './payments/paymentService.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }
  return supabase
}

/**
 * Save a remittance quote to database
 */
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

/**
 * Initiate a remittance transfer using a saved quote
 */
export async function initiateRemittanceTransfer(userId, quoteId, recipientAccount) {
  const client = getSupabaseRequired()

  // Get quote
  const { data: quote, error: quoteError } = await client
    .from('remittance_quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('user_id', userId)
    .single()

  if (quoteError || !quote) {
    throw new Error('Quote not found')
  }

  // Check quote is still valid
  if (quote.status !== 'pending') {
    throw new Error('Quote is no longer valid')
  }

  const now = new Date()
  if (new Date(quote.locked_until) < now) {
    // Mark quote as expired
    await client.from('remittance_quotes').update({ status: 'expired' }).eq('id', quoteId)
    throw new Error('Quote lock has expired')
  }

  try {
    // Save transaction to database
    const { data: transaction, error: txnError } = await client
      .from('remittance_transactions')
      .insert({
        user_id: userId,
        quote_id: quoteId,
        provider: quote.provider,
        provider_transaction_id: `DEMO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        amount_npr: quote.amount_npr,
        fee_npr: quote.fee_npr,
        fx_rate: quote.fx_rate,
        delivery_method: quote.delivery_method,
        recipient_name: quote.recipient_name,
        recipient_phone: quote.recipient_phone,
        status: 'pending',
      })
      .select()
      .single()

    if (txnError) {
      throw new Error(`Failed to save transaction: ${txnError.message}`)
    }

    // Update quote status
    await client.from('remittance_quotes').update({ status: 'used' }).eq('id', quoteId)

    return transaction
  } catch (error) {
    throw new Error(`Transfer failed: ${error.message}`)
  }
}

/**
 * Check transaction status with provider
 */
export async function checkTransactionStatus(userId, transactionId) {
  const client = getSupabaseRequired()

  const { data: transaction, error } = await client
    .from('remittance_transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single()

  if (error || !transaction) {
    throw new Error('Transaction not found')
  }

  try {
    // Check status with provider
    const status = await checkStatus(transaction.provider_transaction_id)

    // Update transaction if status changed
    if (status.status !== transaction.status) {
      const { error: updateError } = await client
        .from('remittance_transactions')
        .update({
          status: status.status,
          completed_at: status.completed_at,
        })
        .eq('id', transactionId)

      if (updateError) {
        console.warn('Failed to update transaction status:', updateError)
      }
    }

    return status
  } catch (error) {
    console.error('Failed to check transaction status:', error)
    return transaction
  }
}

/**
 * Get user's remittance transactions
 */
export async function getUserTransactions(userId, limit = 20) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('remittance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return data
}

/**
 * Get user's remittance history with quotes
 */
export async function getUserRemittanceHistory(userId, limit = 50) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('remittance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch remittance history: ${error.message}`)
  }

  return data
}
