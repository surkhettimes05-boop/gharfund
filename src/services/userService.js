import { supabase } from '../lib/supabase.js'

function getSupabaseRequired() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check VITE_SUPABASE_* values.')
  }

  return supabase
}

export async function getCurrentUserProfile(userId) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('users')
    .select(
      'id, name, phone, working_location, language_preference, family_token, reminder_enabled, is_founder',
    )
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getCurrentUserStreak(userId) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function updateCurrentUserProfile(userId, updates) {
  const client = getSupabaseRequired()
  const { data, error } = await client
    .from('users')
    .update({
      ...updates,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select(
      'id, name, phone, working_location, language_preference, family_token, reminder_enabled, is_founder',
    )
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateReminderPreference(userId, reminderEnabled) {
  return updateCurrentUserProfile(userId, { reminder_enabled: reminderEnabled })
}
