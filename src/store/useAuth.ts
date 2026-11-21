import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Role = 'user' | 'admin'

interface AuthState {
  user: User | null
  /** null selama belum login atau role masih dimuat. Hanya untuk tampilan, hak akses ditegakkan RLS. */
  role: Role | null
  loading: boolean
  /** Mulai mendengarkan sesi. Mengembalikan fungsi untuk berhenti. */
  init: () => () => void
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<string | null>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  role: null,
  loading: supabase !== null,
  init: () => {
    if (!supabase) {
      set({ loading: false })
      return () => {}
    }
    const client = supabase
    const loadRole = (uid: string | undefined) => {
      if (!uid) return set({ role: null })
      void client
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle()
        .then(({ data }) => set({ role: data?.role === 'admin' ? 'admin' : 'user' }))
    }
    client.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, loading: false })
      loadRole(data.session?.user.id)
    })
    const { data } = client.auth.onAuthStateChange((event, session) => {
      set({ user: session?.user ?? null, loading: false })
      loadRole(session?.user.id)
      if (event === 'SIGNED_IN' && session) {
        // tidak menunggu; kegagalan di sini tidak boleh mengganggu login
        void client.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', session.user.id)
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
