import { createClient } from '@supabase/supabase-js'
import { firebaseAuth } from './firebase.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        accessToken: async () => {
          if (!firebaseAuth?.currentUser) {
            return null
          }

          return firebaseAuth.currentUser.getIdToken()
        },
      })
    : null
