import { createClient } from '@supabase/supabase-js'

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://your-project.supabase.co'
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    flowType: 'implicit',
  },
})
