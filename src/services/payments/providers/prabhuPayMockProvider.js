/**
 * Prabhu Pay Mock Provider
 * Simulates Prabhu Pay remittance API responses
 * MOCK ONLY - No real provider credentials required
 */

import { generateId } from '../../utils/id.js'
import {
  InvalidQuoteError,
  InvalidTransferError,
  InvalidRecipientError,
  QuoteExpiredError,
  TransferFailedError,
} from './paymentErrors.js'
import { DELIVERY_METHODS, QUOTE_STATUSES, TRANSACTION_STATUSES } from './paymentTypes.js'

/**
 * Prabhu Pay mock provider configuration
 */
const PRABHU_PAY_CONFIG = {
  provider: 'prabhu_pay',
  fee_rate: 1.8, // 1.8% fee (slightly higher than IME)
  fx_rate: 132.0, // 1 USD = 132.0 NPR (slightly better rate)
  quote_lock_duration_minutes: 25,
  supported_delivery_methods: [
    DELIVERY_METHODS.BANK_TRANSFER,
    DELIVERY_METHODS.WALLET,
  ],
}

/**
 * Mock quote storage (in-memory for simulation)
 * In production: use database
 */
const mockQuoteStore = new Map()

/**
 * Mock transaction storage (in-memory for simulation)
 * In production: query provider API
 */
const mockTransactionStore = new Map()

/**
 * Generate mock Prabhu Pay transaction ID
 * Format: PRABHU-YYYYMMDD-XXXXXX (example: PRABHU-20260427-12AB34)
 */
function generateMockTransactionId() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `PRABHU-${today}-${randomPart}`
}

/**
 * Get a remittance quote from Prabhu Pay
 * @param {Object} quoteRequest - { amount_npr, destination_country, delivery_method }
 * @returns {Promise<Object>} Quote with locked rates
 */
export async function getQuote(quoteRequest) {
  const { amount_npr, destination_country, delivery_method } = quoteRequest

  // Validate inputs
  if (!amount_npr || amount_npr <= 0) {
    throw new InvalidQuoteError('Amount must be positive', { amount_npr })
  }

  if (!destination_country) {
    throw new InvalidQuoteError('Destination country required', { destination_country })
  }

  if (!delivery_method) {
    throw new InvalidQuoteError('Delivery method required', { delivery_method })
  }

  if (!PRABHU_PAY_CONFIG.supported_delivery_methods.includes(delivery_method)) {
    throw new InvalidQuoteError(
      `Delivery method ${delivery_method} not supported by Prabhu Pay`,
      { delivery_method, supported: PRABHU_PAY_CONFIG.supported_delivery_methods },
    )
  }

  // Calculate fees and total
  const fee_npr = Math.round(amount_npr * (PRABHU_PAY_CONFIG.fee_rate / 100))
  const total_npr = amount_npr + fee_npr

  // Create quote
  const quote = {
    id: `quote_${generateId()}`,
    amount_npr,
    fee_npr,
    fee_rate: PRABHU_PAY_CONFIG.fee_rate,
    fx_rate: PRABHU_PAY_CONFIG.fx_rate,
    provider: PRABHU_PAY_CONFIG.provider,
    delivery_method,
    destination_country,
    total_npr,
    status: QUOTE_STATUSES.ACTIVE,
    created_at: new Date().toISOString(),
    locked_until: new Date(
      Date.now() + PRABHU_PAY_CONFIG.quote_lock_duration_minutes * 60 * 1000,
    ).toISOString(),
  }

  // Store for later retrieval
  mockQuoteStore.set(quote.id, quote)

  // Log for debugging
  console.log('[Prabhu Pay] Quote generated:', quote.id)

  return quote
}

/**
 * Lock a quote (prevent expiration during user review)
 * @param {string} quoteId - Quote ID to lock
 * @returns {Promise<Object>} Locked quote
 */
export async function lockQuote(quoteId) {
  const quote = mockQuoteStore.get(quoteId)

  if (!quote) {
    throw new InvalidQuoteError('Quote not found', { quoteId })
  }

  if (quote.status !== QUOTE_STATUSES.ACTIVE) {
    throw new QuoteExpiredError(quoteId, quote.locked_until)
  }

  const now = new Date()
  if (new Date(quote.locked_until) < now) {
    quote.status = QUOTE_STATUSES.EXPIRED
    throw new QuoteExpiredError(quoteId, quote.locked_until)
  }

  // Extend lock duration
  quote.locked_until = new Date(
    Date.now() + PRABHU_PAY_CONFIG.quote_lock_duration_minutes * 60 * 1000,
  ).toISOString()

  console.log('[Prabhu Pay] Quote locked:', quoteId)

  return quote
}

/**
 * Initiate a transfer using a locked quote
 * @param {Object} transferRequest - { quote_id, recipient_name, recipient_phone, recipient_account }
 * @returns {Promise<Object>} Transaction with provider reference
 */
export async function initiateTransfer(transferRequest) {
  const { quote_id, recipient_name, recipient_phone, recipient_account } = transferRequest

  // Validate quote
  const quote = mockQuoteStore.get(quote_id)
  if (!quote) {
    throw new InvalidTransferError('Quote not found', { quote_id })
  }

  if (quote.status !== QUOTE_STATUSES.ACTIVE) {
    throw new QuoteExpiredError(quote_id, quote.locked_until)
  }

  const now = new Date()
  if (new Date(quote.locked_until) < now) {
    quote.status = QUOTE_STATUSES.EXPIRED
    throw new QuoteExpiredError(quote_id, quote.locked_until)
  }

  // Validate recipient
  if (!recipient_name || recipient_name.length < 2) {
    throw new InvalidRecipientError('name', recipient_name, {
      reason: 'Must be at least 2 characters',
    })
  }

  if (!recipient_phone || !recipient_phone.match(/^\+[0-9]{10,15}$/)) {
    throw new InvalidRecipientError('phone', recipient_phone, {
      reason: 'Must be in E.164 format',
    })
  }

  if (!recipient_account) {
    throw new InvalidRecipientError('account', recipient_account, {
      reason: 'Recipient account/reference required',
    })
  }

  // Mark quote as used
  quote.status = QUOTE_STATUSES.USED

  // Generate transaction
  const provider_transaction_id = generateMockTransactionId()
  const transaction = {
    id: `txn_${generateId()}`,
    provider_transaction_id,
    quote_id,
    amount_npr: quote.amount_npr,
    fee_npr: quote.fee_npr,
    fx_rate: quote.fx_rate,
    provider: PRABHU_PAY_CONFIG.provider,
    delivery_method: quote.delivery_method,
    destination_country: quote.destination_country,
    recipient_name,
    recipient_phone,
    recipient_account,
    status: TRANSACTION_STATUSES.PENDING,
    created_at: new Date().toISOString(),
    completed_at: null,
    estimated_delivery: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12h from now (faster)
    metadata: {
      initiated_at: new Date().toISOString(),
      delivery_method_confirmed: quote.delivery_method,
    },
  }

  // Store transaction
  mockTransactionStore.set(transaction.id, transaction)
  mockTransactionStore.set(provider_transaction_id, transaction)

  console.log('[Prabhu Pay] Transfer initiated:', provider_transaction_id)

  return transaction
}

/**
 * Check transfer status
 * @param {string} transactionId - Transaction ID or provider transaction ID
 * @returns {Promise<Object>} Current transaction status
 */
export async function checkStatus(transactionId) {
  const transaction = mockTransactionStore.get(transactionId)

  if (!transaction) {
    throw new InvalidTransferError('Transaction not found', { transactionId })
  }

  // Simulate status progression for demo
  const createdAt = new Date(transaction.created_at)
  const elapsed = Date.now() - createdAt.getTime()
  const elapsedSeconds = Math.floor(elapsed / 1000)

  let currentStatus = transaction.status

  // Auto-progress status in mock for demonstration (faster than IME)
  if (elapsedSeconds > 20 && currentStatus === TRANSACTION_STATUSES.PENDING) {
    currentStatus = TRANSACTION_STATUSES.PROCESSING
    transaction.status = currentStatus
  }

  if (elapsedSeconds > 40 && currentStatus === TRANSACTION_STATUSES.PROCESSING) {
    currentStatus = TRANSACTION_STATUSES.COMPLETED
    transaction.status = currentStatus
    transaction.completed_at = new Date().toISOString()
  }

  console.log('[Prabhu Pay] Status check:', transactionId, '->', currentStatus)

  return {
    ...transaction,
    status: currentStatus,
  }
}

/**
 * Mock provider interface
 */
export const prabhuPayMockProvider = {
  provider: PRABHU_PAY_CONFIG.provider,
  getQuote,
  lockQuote,
  initiateTransfer,
  checkStatus,
  config: PRABHU_PAY_CONFIG,
}

export default prabhuPayMockProvider
