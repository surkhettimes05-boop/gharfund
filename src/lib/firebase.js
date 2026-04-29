import { initializeApp } from 'firebase/app'
import {
  RecaptchaVerifier,
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPhoneNumber,
} from 'firebase/auth'

const firebaseEnvEntries = [
  ['apiKey', 'VITE_FIREBASE_API_KEY'],
  ['authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'],
  ['projectId', 'VITE_FIREBASE_PROJECT_ID'],
  ['appId', 'VITE_FIREBASE_APP_ID'],
  ['messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID'],
  ['storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET'],
]

const firebaseConfig = Object.fromEntries(
  firebaseEnvEntries.map(([configKey, envName]) => [
    configKey,
    import.meta.env[envName]?.trim() || '',
  ]),
)

const missingFirebaseEnvNames = firebaseEnvEntries
  .filter(([configKey]) => !firebaseConfig[configKey])
  .map(([, envName]) => envName)

if (import.meta.env.DEV && missingFirebaseEnvNames.length > 0) {
  console.warn(
    `Missing Firebase config in development: ${missingFirebaseEnvNames.join(', ')}`,
  )
}

export const firebaseApp = missingFirebaseEnvNames.length === 0
  ? initializeApp(firebaseConfig)
  : null

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null

export function normalizeNepalPhone(localNumber) {
  const digits = localNumber.replace(/\D/g, '')
  const withoutCountryCode = digits.startsWith('977') ? digits.slice(3) : digits
  const withoutLeadingZero = withoutCountryCode.startsWith('0')
    ? withoutCountryCode.slice(1)
    : withoutCountryCode

  return `+977${withoutLeadingZero}`
}

export function isValidNepalPhone(localNumber) {
  return /^\+9779\d{9}$/.test(normalizeNepalPhone(localNumber))
}

export function getFirebaseAuthRequired() {
  if (!firebaseAuth) {
    throw new Error(
      `Missing Firebase config: ${missingFirebaseEnvNames.join(', ') || 'unknown'}`,
    )
  }

  return firebaseAuth
}

export function createRecaptchaVerifier(containerId) {
  const auth = getFirebaseAuthRequired()

  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  })
}

export async function sendPhoneOtp(phoneNumber, recaptchaVerifier) {
  const auth = getFirebaseAuthRequired()
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
}

export function subscribeToFirebaseSession(callback) {
  if (!firebaseAuth) {
    return () => {}
  }

  return onAuthStateChanged(firebaseAuth, callback)
}

export async function getFreshFirebaseIdToken(forceRefresh = false) {
  const auth = getFirebaseAuthRequired()

  if (!auth.currentUser) {
    throw new Error('No Firebase user is signed in.')
  }

  return auth.currentUser.getIdToken(forceRefresh)
}

export async function signOutFirebaseSession() {
  const auth = getFirebaseAuthRequired()
  await signOut(auth)
}
