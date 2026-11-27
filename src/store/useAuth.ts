import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { useSelection } from './useSelection'
import { useVocabStore } from './useVocabStore'
import { useKanjiStore } from './useKanjiStore'

export type Role = 'user' | 'admin'

interface AuthState {
  user: User | null
  /** null selama belum login atau role masih dimuat. Hanya untuk tampilan, hak akses ditegakkan RLS. */
  role: Role | null
  loading: boolean
  /** Mulai mendengarkan sesi. Mengembalikan fungsi untuk berhenti. */
  init: () => () => void
  signIn: () => Promise<void>
  signInWithGoogleIdToken: (token: string, nonce?: string) => Promise<string | null>
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
        const meta = session.user.user_metadata
        const avatarUrl = (meta?.avatar_url || meta?.picture || null) as string | null
        const fullName = (meta?.full_name || null) as string | null
        void client
          .from('profiles')
          .update({
            last_login_at: new Date().toISOString(),
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
            ...(fullName ? { display_name: fullName } : {}),
          })
          .eq('id', session.user.id)
      }
    })
    return () => data.subscription.unsubscribe()
  },
  signIn: async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  },
  signInWithGoogleIdToken: async (token, nonce) => {
    if (!supabase) return 'Supabase belum dikonfigurasi'
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token,
      nonce,
    })
    return error ? error.message : null
  },
  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  },
  deleteAccount: async () => {
    if (!supabase) return 'Supabase belum dikonfigurasi'
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return error.message

    // Bersihkan seluruh progres lokal dan antrean sinkronisasi offline
    useSelection.getState().resetOnLogout()
    useVocabStore.getState().resetOnLogout()
    useKanjiStore.getState().resetOnLogout()
    try {
      localStorage.removeItem('vocab_progress_storage_v1')
      localStorage.removeItem('kanji_progress_storage_v1')
      localStorage.removeItem('kana-legacy-snapshot')
      localStorage.removeItem('kana-legacy-migrated')
    } catch {
      // Abaikan jika storage tidak tersedia
    }
    await Promise.allSettled([
      db.pending_answers.clear(),
      db.pending_sessions.clear(),
      db.pending_vocab_answers.clear(),
      db.pending_vocab_sessions.clear(),
      db.pending_kanji_answers.clear(),
      db.pending_kanji_sessions.clear(),
    ])

    await supabase.auth.signOut()
    return null
  },
}))
