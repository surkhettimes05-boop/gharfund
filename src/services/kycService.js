import { supabase } from '../lib/supabase.js'

// ---------------------------------------------------------------------------
// KYC status constants – must match the check constraint on users.kyc_status
// ---------------------------------------------------------------------------
export const KYC_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
}

export const KYC_DOCUMENT_TYPES = [
  { value: 'citizenship', label: 'Citizenship Certificate' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID Card' },
]

// Storage bucket name – must exist in Supabase Storage before uploading.
const KYC_BUCKET = 'kyc-documents'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }
  return supabase
}

/**
 * Upload a single file to the kyc-documents bucket.
 * Returns the storage path string.
 *
 * @param {string} userId      Supabase users.id
 * @param {'document'|'selfie'} kind
 * @param {File} file
 */
export async function uploadKycFile(userId, kind, file) {
  const client = getSupabaseRequired()

  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  // e.g. abc-123/document_1714567890.jpg
  const path = `${userId}/${kind}_${timestamp}.${ext}`

  const { error } = await client.storage.from(KYC_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(`Failed to upload ${kind}: ${error.message}`)
  }

  return path
}

/**
 * Insert a kyc_submissions row and set users.kyc_status → 'pending'.
 *
 * @param {{
 *   userId: string,
 *   documentType: string,
 *   documentPath: string,
 *   selfiePath: string,
 * }} params
 */
export async function submitKyc({ userId, documentType, documentPath, selfiePath }) {
  const client = getSupabaseRequired()

  // 1 – insert submission record
  const { data: submission, error: insertError } = await client
    .from('kyc_submissions')
    .insert({
      user_id: userId,
      document_type: documentType,
      document_path: documentPath,
      selfie_path: selfiePath,
      status: KYC_STATUS.PENDING,
      submitted_at: new Date().toISOString(),
    })
    .select('id, status, submitted_at')
    .single()

  if (insertError) {
    throw new Error(`KYC submission failed: ${insertError.message}`)
  }

  // 2 – update user kyc_status → pending
  const { error: updateError } = await client
    .from('users')
    .update({ kyc_status: KYC_STATUS.PENDING })
    .eq('id', userId)

  if (updateError) {
    throw new Error(`KYC status update failed: ${updateError.message}`)
  }

  return submission
}

/**
 * Fetch the latest kyc_submission for this user (most recent submitted_at).
 * Returns null if none exists.
 *
 * @param {string} userId
 */
export async function getLatestKycSubmission(userId) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('kyc_submissions')
    .select('id, document_type, status, submitted_at, reviewer_note')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Could not load KYC status: ${error.message}`)
  }

  return data
}

/**
 * Fetch kyc_status directly from the users row.
 *
 * @param {string} userId
 * @returns {Promise<string>} one of KYC_STATUS values
 */
export async function getUserKycStatus(userId) {
  const client = getSupabaseRequired()

  const { data, error } = await client
    .from('users')
    .select('kyc_status')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Could not load KYC status: ${error.message}`)
  }

  return data?.kyc_status ?? KYC_STATUS.UNVERIFIED
}
