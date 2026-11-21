import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null jika env belum diisi: aplikasi tetap jalan lokal tanpa login. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null
export const supabaseEnabled = supabase !== null
