import { initializeApp } from 'firebase/app'
import {
  RecaptchaVerifier,
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPhoneNumber,
} from 'firebase/auth'

// ---------------------------------------------------------------------------
// Build the Firebase config from VITE_FIREBASE_* environment variables.
// All six variables must be present; Vite only forwards VITE_-prefixed vars.
// ---------------------------------------------------------------------------
const REQUIRED_FIREBASE_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

/** Returns an array of env-var names that are missing or empty. */
function getMissingFirebaseVars() {
  return REQUIRED_FIREBASE_VARS.filter(
    (name) => !import.meta.env[name],
  )
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/** True only when every required Firebase env variable is present. */
export const isFirebaseConfigured = getMissingFirebaseVars().length === 0

export const firebaseApp = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null

// Dev-time diagnostic: list missing variable names (never their values).
if (!isFirebaseConfigured) {
  const missing = getMissingFirebaseVars()
  // eslint-disable-next-line no-console
  console.error(
    '[gharfund] Firebase is NOT configured.\n' +
      'The following VITE_FIREBASE_* environment variables are missing or empty:\n' +
      missing.map((v) => `  • ${v}`).join('\n') +
      '\n\nVercel fix:\n' +
      '  Dashboard → Your Project → Settings → Environment Variables\n' +
      '  Add each missing variable → select Production + Preview + Development → Save\n' +
      '  Then trigger a new deployment (Deployments → Redeploy).',
  )
}

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
    const missing = getMissingFirebaseVars()
    const detail =
      missing.length > 0
        ? `Missing variables: ${missing.join(', ')}`
        : 'All variables are present but Firebase failed to initialise.'
    throw new Error(`Firebase is not configured. ${detail}`)
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
