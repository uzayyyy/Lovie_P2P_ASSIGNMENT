import { supabaseDataProvider } from 'ra-supabase'
import { supabase, supabaseAnonKey, supabaseUrl } from 'src/providers/supabaseClient'

export const dataProvider = supabaseDataProvider({
  instanceUrl: supabaseUrl,
  apiKey: supabaseAnonKey,
  supabaseClient: supabase,
})
