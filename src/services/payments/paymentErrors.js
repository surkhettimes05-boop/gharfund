/**
 * Payment Service Errors
 * Safe, standardized error types for payment operations
 */

/**
 * Base payment error
 */
export class PaymentError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'PaymentError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }

  toJSON() {
    return {
      error: true,
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Provider is unavailable or not responding
 */
export class ProviderUnavailableError extends PaymentError {
  constructor(provider, details = {}) {
    super(
      'PROVIDER_UNAVAILABLE',
      `Payment provider ${provider} is temporarily unavailable`,
      { provider, ...details },
    )
    this.name = 'ProviderUnavailableError'
  }
}

/**
 * Quote has expired and can no longer be used
 */
export class QuoteExpiredError extends PaymentError {
  constructor(quoteId, expirationTime, details = {}) {
    super(
      'QUOTE_EXPIRED',
      `Quote ${quoteId} expired at ${expirationTime}`,
      { quoteId, expirationTime, ...details },
    )
    this.name = 'QuoteExpiredError'
  }
}

/**
 * User is not KYC verified for this transaction amount
 */
export class KycRequiredError extends PaymentError {
  constructor(reason, details = {}) {
    super(
      'KYC_REQUIRED',
      `KYC verification required: ${reason}`,
      details,
    )
    this.name = 'KycRequiredError'
  }
}

/**
 * Transfer failed at provider
 */
export class TransferFailedError extends PaymentError {
  constructor(transactionId, reason, details = {}) {
    super(
      'TRANSFER_FAILED',
      `Transfer ${transactionId} failed: ${reason}`,
      { transactionId, reason, ...details },
    )
    this.name = 'TransferFailedError'
  }
}

/**
 * Invalid quote parameters
 */
export class InvalidQuoteError extends PaymentError {
  constructor(reason, details = {}) {
    super(
      'INVALID_QUOTE',
      `Invalid quote parameters: ${reason}`,
      details,
    )
    this.name = 'InvalidQuoteError'
  }
}

/**
 * Invalid transfer parameters
 */
export class InvalidTransferError extends PaymentError {
  constructor(reason, details = {}) {
    super(
      'INVALID_TRANSFER',
      `Invalid transfer parameters: ${reason}`,
      details,
    )
    this.name = 'InvalidTransferError'
  }
}

/**
 * Recipient data is invalid
 */
export class InvalidRecipientError extends PaymentError {
  constructor(field, value, details = {}) {
    super(
      'INVALID_RECIPIENT',
      `Invalid recipient ${field}: ${value}`,
      { field, value, ...details },
    )
    this.name = 'InvalidRecipientError'
  }
}

/**
 * Provider configuration is missing
 */
export class ProviderConfigError extends PaymentError {
  constructor(provider, missing, details = {}) {
    super(
      'PROVIDER_CONFIG_ERROR',
      `Provider ${provider} missing configuration: ${missing}`,
      { provider, missing, ...details },
    )
    this.name = 'ProviderConfigError'
  }
}

export default {
  PaymentError,
  ProviderUnavailableError,
  QuoteExpiredError,
  KycRequiredError,
  TransferFailedError,
  InvalidQuoteError,
  InvalidTransferError,
  InvalidRecipientError,
  ProviderConfigError,
}
