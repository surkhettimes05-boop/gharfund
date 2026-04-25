import { formatNpr } from './money.js'

function getWindowOrigin() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.origin
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || '').trim().replace(/\/+$/, '')
}

export function getAppBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_APP_BASE_URL)

  if (configuredBaseUrl) {
    return configuredBaseUrl
  }

  return normalizeBaseUrl(getWindowOrigin())
}

function normalizePhoneNumber(phoneNumber) {
  return (phoneNumber || '').replace(/[^\d]/g, '')
}

export function buildWaMeLink(phoneNumber, message) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  const baseUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}` : 'https://wa.me/'
  const encodedMessage = encodeURIComponent(message || '')

  return encodedMessage ? `${baseUrl}?text=${encodedMessage}` : baseUrl
}

export function buildFamilyViewUrl(familyToken) {
  if (!familyToken) {
    return ''
  }

  const appBaseUrl = getAppBaseUrl()

  if (!appBaseUrl) {
    return ''
  }

  return `${appBaseUrl}/family/${familyToken}`
}

export function buildFamilyViewShareLink({ familyToken }) {
  const familyUrl = buildFamilyViewUrl(familyToken)

  if (!familyUrl) {
    return ''
  }

  return buildWaMeLink('', `Namaste. Follow my SansarPay family dashboard: ${familyUrl}`)
}

export function buildTransferLoggedLink({ name, amount, familyToken }) {
  const familyUrl = buildFamilyViewUrl(familyToken)

  if (!familyUrl) {
    return ''
  }

  const senderName = name || 'Ma'
  return buildWaMeLink('', `${senderName} le ${formatNpr(amount)} pathaayo. Family dashboard: ${familyUrl}`)
}

export function buildFamilyAcknowledgedLink({ familyToken }) {
  const familyUrl = buildFamilyViewUrl(familyToken)

  if (!familyUrl) {
    return ''
  }

  return buildWaMeLink('', `Transfer receive gareko confirm bhayo. Family dashboard: ${familyUrl}`)
}

export function buildGoalMilestoneShareLink({ goalName, milestonePercent, familyToken }) {
  const familyUrl = buildFamilyViewUrl(familyToken)
  const message = familyUrl
    ? `Mero ${goalName} ko ${milestonePercent}% pura bhayo! ${familyUrl}`
    : `Mero ${goalName} ko ${milestonePercent}% pura bhayo!`

  return buildWaMeLink('', message)
}

export function buildFounderFeedbackLink() {
  return buildFounderFeedbackPrefillLink('Namaste, I used SansarPay. My feedback is:')
}

export function buildFounderFeedbackPrefillLink(message) {
  const founderPhone = import.meta.env.VITE_FOUNDER_WHATSAPP || ''

  if (!normalizePhoneNumber(founderPhone)) {
    return ''
  }

  return buildWaMeLink(founderPhone, message || 'Namaste, I used SansarPay. My feedback is:')
}
