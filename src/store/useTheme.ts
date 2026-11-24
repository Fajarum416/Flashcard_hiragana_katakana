import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('kana_theme')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed?.state?.theme === 'light' || parsed?.state?.theme === 'dark') {
        return parsed.state.theme
      }
    } catch {}
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
  }
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#090d16' : '#f8fafc')
  }
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: getInitialTheme(),
      toggleTheme: () => {
        const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
      setTheme: (theme: Theme) => {
        set({ theme })
        applyTheme(theme)
      },
    }),
    {
      name: 'kana_theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)
