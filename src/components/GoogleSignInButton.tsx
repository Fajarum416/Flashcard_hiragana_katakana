import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../store/useAuth'

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            nonce?: string
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: number
              locale?: string
            },
          ) => void
          cancel: () => void
        }
      }
    }
  }
}

export const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || ''

async function generateNonce(): Promise<[string, string]> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const rawNonce = btoa(String.fromCharCode(...bytes))
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawNonce))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return [rawNonce, hashedNonce]
}

// Shared GIS state so multiple mounted buttons (desktop dropdown + mobile drawer) share one nonce/callback
interface GisSubscriber {
  onSuccess?: () => void
  onError?: (msg: string) => void
  setSigningIn: (v: boolean) => void
}
const subscribers = new Set<GisSubscriber>()
let gisInitPromise: Promise<boolean> | null = null

function ensureGisInitialized(): Promise<boolean> {
  if (!googleClientId) return Promise.resolve(false)
  if (gisInitPromise) return gisInitPromise

  gisInitPromise = (async () => {
    const start = Date.now()
    while (!window.google?.accounts?.id && Date.now() - start < 5000) {
      await new Promise((r) => setTimeout(r, 100))
    }
    const gis = window.google?.accounts?.id
    if (!gis) {
      gisInitPromise = null
      return false
    }

    const [rawNonce, hashedNonce] = await generateNonce()
    gis.initialize({
      client_id: googleClientId,
      nonce: hashedNonce,
      callback: async (response) => {
        if (!response.credential) {
          for (const sub of subscribers) sub.onError?.('Token Google tidak ditemukan.')
          return
        }
        for (const sub of subscribers) sub.setSigningIn(true)
        const err = await useAuth.getState().signInWithGoogleIdToken(response.credential, rawNonce)
        for (const sub of subscribers) sub.setSigningIn(false)
        // Reset init promise so next login (after logout) gets a fresh nonce
        gisInitPromise = null
        if (err) {
          for (const sub of subscribers) sub.onError?.(`Gagal masuk: ${err}`)
        } else {
          for (const sub of subscribers) sub.onSuccess?.()
        }
      },
    })
    return true
  })()

  return gisInitPromise
}

interface GoogleSignInButtonProps {
  width?: number
  disabled?: boolean
  onSuccess?: () => void
  onError?: (msg: string) => void
  onFallbackClick?: () => void
}

export function GoogleSignInButton({
  width = 248,
  disabled = false,
  onSuccess,
  onError,
  onFallbackClick,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(!googleClientId)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!googleClientId) {
      setFailed(true)
      return
    }
    let cancelled = false

    void ensureGisInitialized().then((ok) => {
      if (cancelled) return
      const gis = window.google?.accounts?.id
      const el = containerRef.current
      if (!ok || !gis || !el) {
        setFailed(true)
        return
      }
      el.innerHTML = ''
      gis.renderButton(el, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width,
        locale: 'id',
      })
      setReady(true)
      setFailed(false)
    })

    return () => {
      cancelled = true
    }
  }, [width])

  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  useEffect(() => {
    const sub: GisSubscriber = {
      onSuccess: () => onSuccessRef.current?.(),
      onError: (m) => onErrorRef.current?.(m),
      setSigningIn,
    }
    subscribers.add(sub)
    return () => {
      subscribers.delete(sub)
    }
  }, [])

  if (signingIn) {
    return (
      <div className="flex items-center justify-center gap-2 h-11 w-full text-sm text-ink">
        <span className="loading loading-spinner loading-sm" />
        <span>Sedang masuk...</span>
      </div>
    )
  }

  if (failed) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onFallbackClick}
        className="btn btn-primary btn-md w-full rounded-full text-base font-semibold normal-case"
      >
        Masuk dengan Google
      </button>
    )
  }

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[44px]">
      {!ready && (
        <div className="flex items-center justify-center gap-2 h-11 text-xs text-muted">
          <span className="loading loading-spinner loading-xs" />
          <span>Memuat Google...</span>
        </div>
      )}
      <div ref={containerRef} className={ready ? 'flex justify-center' : 'hidden'} />
    </div>
  )
}
