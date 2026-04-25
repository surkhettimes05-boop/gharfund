import { initializeApp } from 'firebase/app'
import {
  RecaptchaVerifier,
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPhoneNumber,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp = firebaseConfig.apiKey
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
    throw new Error('Firebase is not configured. Check VITE_FIREBASE_* values.')
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
