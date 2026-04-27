/**
 * Payment Service
 * Unified facade for payment operations across multiple providers
 * Abstracts provider differences and provides consistent interface
 */

import imePayMockProvider from './providers/imePayMockProvider.js'
import prabhuPayMockProvider from './providers/prabhuPayMockProvider.js'
import { PROVIDERS } from './paymentTypes.js'
import { ProviderConfigError } from './paymentErrors.js'

/**
 * Available providers
 */
const providers = {
  [PROVIDERS.IME_PAY]: imePayMockProvider,
  [PROVIDERS.PRABHU_PAY]: prabhuPayMockProvider,
}

/**
 * Current active provider
 */
let activeProvider = PROVIDERS.IME_PAY

/**
 * Set the active payment provider
 * @param {string} providerName - Provider to activate (ime_pay or prabhu_pay)
 * @throws {ProviderConfigError} If provider not found
 */
export function setProvider(providerName) {
  if (!providers[providerName]) {
    throw new ProviderConfigError(
      providerName,
      `Available providers: ${Object.keys(providers).join(', ')}`,
    )
  }
  activeProvider = providerName
  console.log(`[Payment Service] Provider switched to: ${providerName}`)
}

/**
 * Get the current active provider
 * @returns {string} Current provider name
 */
export function getActiveProvider() {
  return activeProvider
}

/**
 * Get provider configuration
 * @param {string} providerName - Optional provider name (uses active if not specified)
 * @returns {Object} Provider configuration
 */
export function getProviderConfig(providerName = activeProvider) {
  const provider = providers[providerName]
  if (!provider) {
    throw new ProviderConfigError(providerName, 'Provider not found')
  }
  return provider.config
}

/**
 * Get a remittance quote from the active provider
 * @param {Object} quoteRequest - { amount_npr, destination_country, delivery_method }
 * @returns {Promise<Object>} Quote with locked rates
 */
export async function getQuote(quoteRequest) {
  const provider = providers[activeProvider]
  if (!provider) {
    throw new ProviderConfigError(activeProvider, 'Provider not found')
  }
  return provider.getQuote(quoteRequest)
}

/**
 * Lock a quote with the active provider
 * @param {string} quoteId - Quote ID to lock
 * @returns {Promise<Object>} Locked quote
 */
export async function lockQuote(quoteId) {
  const provider = providers[activeProvider]
  if (!provider) {
    throw new ProviderConfigError(activeProvider, 'Provider not found')
  }
  return provider.lockQuote(quoteId)
}

/**
 * Initiate a transfer with the active provider
 * @param {Object} transferRequest - { quote_id, recipient_name, recipient_phone, recipient_account }
 * @returns {Promise<Object>} Transaction with provider reference
 */
export async function initiateTransfer(transferRequest) {
  const provider = providers[activeProvider]
  if (!provider) {
    throw new ProviderConfigError(activeProvider, 'Provider not found')
  }
  return provider.initiateTransfer(transferRequest)
}

/**
 * Check transfer status with the active provider
 * @param {string} transactionId - Transaction ID to check
 * @returns {Promise<Object>} Current transaction status
 */
export async function checkStatus(transactionId) {
  const provider = providers[activeProvider]
  if (!provider) {
    throw new ProviderConfigError(activeProvider, 'Provider not found')
  }
  return provider.checkStatus(transactionId)
}

/**
 * Get all available providers and their configurations
 * @returns {Array<Object>} List of providers with configs
 */
export function getAvailableProviders() {
  return Object.entries(providers).map(([name, provider]) => ({
    name,
    provider: provider.provider,
    config: provider.config,
  }))
}

/**
 * Payment service export
 */
export const paymentService = {
  setProvider,
  getActiveProvider,
  getProviderConfig,
  getQuote,
  lockQuote,
  initiateTransfer,
  checkStatus,
  getAvailableProviders,
}

export default paymentService
