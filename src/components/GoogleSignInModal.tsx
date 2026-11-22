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

interface GoogleSignInModalProps {
  open: boolean
  onClose: () => void
  onFallbackOAuth: () => void
}

export function GoogleSignInModal({ open, onClose, onFallbackOAuth }: GoogleSignInModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const btnContainerRef = useRef<HTMLDivElement | null>(null)
  const { signInWithGoogleIdToken } = useAuth()
  const [status, setStatus] = useState<'loading' | 'ready' | 'signing_in' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open || !googleClientId) return

    let cancelled = false
    setStatus('loading')
    setErrorMsg('')

    const setupGis = async () => {
      // Tunggu script Google Identity Services selesai dimuat (maks 5 detik)
      const start = Date.now()
      while (!window.google?.accounts?.id && Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 100))
        if (cancelled) return
      }

      const gis = window.google?.accounts?.id
      const container = btnContainerRef.current
      if (!gis || !container || cancelled) {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg('Gagal memuat Google Sign-In. Pastikan koneksi internet aktif atau gunakan login alternatif.')
        }
        return
      }

      try {
        const [rawNonce, hashedNonce] = await generateNonce()
        if (cancelled) return

        gis.initialize({
          client_id: googleClientId,
          nonce: hashedNonce,
          callback: async (response) => {
            if (!response.credential) {
              setStatus('error')
              setErrorMsg('Token Google tidak ditemukan.')
              return
            }
            setStatus('signing_in')
            setErrorMsg('')
            const err = await signInWithGoogleIdToken(response.credential, rawNonce)
            if (err) {
              setStatus('error')
              setErrorMsg(`Gagal masuk: ${err}`)
            } else {
              onClose()
            }
          },
        })

        container.innerHTML = ''
        gis.renderButton(container, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 280,
          locale: 'id',
        })
        setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg(err instanceof Error ? err.message : 'Gagal menginisialisasi Google Sign-In.')
        }
      }
    }

    void setupGis()

    return () => {
      cancelled = true
    }
  }, [open, signInWithGoogleIdToken, onClose])

  return (
    <dialog
      ref={dialogRef}
      id="google_signin_modal"
      className="modal"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="modal-box max-w-sm border border-white/10 bg-[#1a1d24] text-ink">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Masuk ke Enna Card</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="btn btn-sm btn-circle btn-ghost text-muted hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-muted mb-6">
          Masuk dengan akun Google untuk menyimpan dan menyinkronkan progres belajarmu di semua perangkat.
        </p>

        <div className="flex flex-col items-center justify-center min-h-[52px]">
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted py-2">
              <span className="loading loading-spinner loading-sm" />
              <span>Memuat Google Sign-In...</span>
            </div>
          )}
          {status === 'signing_in' && (
            <div className="flex items-center gap-2 text-sm text-ink py-2">
              <span className="loading loading-spinner loading-sm" />
              <span>Sedang masuk...</span>
            </div>
          )}
          <div
            ref={btnContainerRef}
            className={status === 'ready' ? 'flex justify-center' : 'hidden'}
          />
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-bad/15 border border-bad/30 px-3.5 py-2.5 text-xs text-bad">
            {errorMsg}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-muted">
          <span>Tombol tidak muncul?</span>
          <button
            type="button"
            onClick={() => {
              onClose()
              onFallbackOAuth()
            }}
            className="link link-hover text-ink font-medium cursor-pointer bg-transparent border-0 p-0"
          >
            Login alternatif
          </button>
        </div>
      </div>
    </dialog>
  )
}
