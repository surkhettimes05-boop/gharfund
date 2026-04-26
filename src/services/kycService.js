import { supabase } from '../lib/supabase.js'

export async function getKycStatus(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('kyc_status')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data.kyc_status
}

export async function uploadKycDocument(userId, file, type) {
  // type: 'id' or 'selfie'
  const path = `${userId}/${type}_${Date.now()}`
  const { error } = await supabase.storage.from('kyc').upload(path, file)
  if (error) throw error
  return path
}

export async function setKycPending(userId) {
  const { error } = await supabase
    .from('users')
    .update({ kyc_status: 'pending' })
    .eq('id', userId)
  if (error) throw error
}

export async function mockApproveKyc(userId) {
  const { error } = await supabase
    .from('users')
    .update({ kyc_status: 'verified' })
    .eq('id', userId)
  if (error) throw error
}
