/**
 * ID Generation Utilities
 * Safe, unique ID generation for internal use
 */

/**
 * Generate a unique ID using crypto random
 * Safe for use in URLs and databases
 * @returns {string} Unique ID (16 hex characters)
 */
export function generateId() {
  // Generate 8 random bytes and convert to hex
  const randomBytes = new Uint8Array(8)
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    window.crypto.getRandomValues(randomBytes)
  } else if (typeof global !== 'undefined' && global.crypto) {
    // Node.js environment
    global.crypto.getRandomValues(randomBytes)
  } else {
    // Fallback: use Math.random() (less secure but works everywhere)
    for (let i = 0; i < 8; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a UUID v4 (if needed for database UUIDs)
 * Uses crypto-secure random
 * @returns {string} UUID v4 format
 */
export function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  if (typeof global !== 'undefined' && global.crypto?.randomUUID) {
    return global.crypto.randomUUID()
  }

  // Fallback implementation
  const chars = '0123456789abcdef'
  let uuid = ''

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-'
    } else if (i === 14) {
      uuid += '4' // UUID v4 version
    } else if (i === 19) {
      uuid += chars[(Math.random() * 4 + 8) | 0]
    } else {
      uuid += chars[Math.floor(Math.random() * 16)]
    }
  }

  return uuid
}

export default {
  generateId,
  generateUUID,
}
