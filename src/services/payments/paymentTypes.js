/**
 * Payment Service Types
 * Type definitions for payment operations (JSDoc-based for runtime safety)
 */

/**
 * @typedef {Object} Quote
 * @property {string} id - Unique quote identifier
 * @property {number} amount_npr - Amount in NPR
 * @property {number} fee_npr - Fee in NPR
 * @property {number} fee_rate - Fee as percentage (0-100)
 * @property {number} fx_rate - Foreign exchange rate
 * @property {string} provider - Provider name (ime_pay, prabhu_pay)
 * @property {string} delivery_method - Delivery method (bank_transfer, cash_pickup, wallet)
 * @property {string} locked_until - ISO timestamp when quote expires
 * @property {string} created_at - ISO timestamp of quote creation
 * @property {string} status - Quote status (active, expired, used, cancelled)
 */

/**
 * @typedef {Object} Transaction
 * @property {string} id - Unique transaction identifier
 * @property {string} provider_transaction_id - Provider's transaction reference
 * @property {number} amount_npr - Amount in NPR
 * @property {number} fee_npr - Fee in NPR
 * @property {number} fx_rate - FX rate at time of transaction
 * @property {string} provider - Provider name
 * @property {string} delivery_method - Delivery method
 * @property {string} status - Transaction status (pending, processing, completed, failed, cancelled)
 * @property {string} estimated_delivery - ISO timestamp of estimated delivery
 * @property {string|null} completed_at - ISO timestamp of actual completion
 * @property {string} created_at - ISO timestamp of transaction creation
 * @property {Object} metadata - Provider-specific data
 */

/**
 * @typedef {Object} QuoteRequest
 * @property {number} amount_npr - Amount to send in NPR
 * @property {string} destination_country - ISO country code (e.g., 'AU', 'MY')
 * @property {string} delivery_method - Preferred delivery method
 */

/**
 * @typedef {Object} TransferRequest
 * @property {string} quote_id - ID of locked quote
 * @property {string} recipient_name - Full name of recipient
 * @property {string} recipient_phone - Phone number in E.164 format
 * @property {string} recipient_account - Bank account or cash pickup reference
 */

/**
 * Valid delivery methods
 */
export const DELIVERY_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  CASH_PICKUP: 'cash_pickup',
  WALLET: 'wallet',
}

/**
 * Valid providers
 */
export const PROVIDERS = {
  IME_PAY: 'ime_pay',
  PRABHU_PAY: 'prabhu_pay',
}

/**
 * Quote statuses
 */
export const QUOTE_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  USED: 'used',
  CANCELLED: 'cancelled',
}

/**
 * Transaction statuses
 */
export const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

export default {
  DELIVERY_METHODS,
  PROVIDERS,
  QUOTE_STATUSES,
  TRANSACTION_STATUSES,
}
