import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  /** Mulai mendengarkan sesi. Mengembalikan fungsi untuk berhenti. */
  init: () => () => void
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<string | null>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: supabase !== null,
  init: () => {
    if (!supabase) {
      set({ loading: false })
      return () => {}
    }
    supabase.auth.getSession().then(({ data }) => set({ user: data.session?.user ?? null, loading: false }))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      set({ user: session?.user ?? null, loading: false })
      if (event === 'SIGNED_IN' && session) {
        // tidak menunggu; kegagalan di sini tidak boleh mengganggu login
        void supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', session.user.id)
      }
    })
    return () => data.subscription.unsubscribe()
  },
  signIn: async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  },
  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  },
  deleteAccount: async () => {
    if (!supabase) return 'Supabase belum dikonfigurasi'
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return error.message
    await supabase.auth.signOut()
    return null
  },
}))
