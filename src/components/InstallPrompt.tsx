import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const [showIOS, setShowIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) return

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)

    if (isIOS) {
      const hasSeenBanner = localStorage.getItem('ios-install-dismissed')
      if (!hasSeenBanner) {
        setShowIOS(true)
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const dismissIOS = () => {
    setDismissed(true)
    setShowIOS(false)
    localStorage.setItem('ios-install-dismissed', '1')
  }

  if (dismissed) return null

  if (showIOS) {
    return (
      <div className="bg-panel border border-accent rounded-xl px-4 py-3 my-3 mx-auto max-w-[1240px] flex items-center justify-between gap-3 text-[13px]">
        <div>
          <strong>Pasang Enna Card di iPhone/iPad:</strong> Ketuk tombol <strong>Bagikan</strong>{' '}
          <span className="text-base">⎋</span> di Safari, lalu pilih <strong>Tambah ke Layar Utama</strong> [+] untuk
          akses offline cepat.
        </div>
        <button
          type="button"
          className="bg-transparent border-0 text-accent font-semibold text-[13px] cursor-pointer px-1.5 py-1 whitespace-nowrap hover:underline"
          onClick={dismissIOS}
        >
          Tutup ✕
        </button>
      </div>
    )
  }

  if (deferredPrompt) {
    return (
      <div className="bg-panel border border-line rounded-xl px-4 py-2.5 my-3 mx-auto max-w-[1240px] flex items-center justify-between gap-3 text-[13px]">
        <div>Pasang Enna Card sebagai aplikasi untuk latihan offline yang lancar.</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="border-0 rounded-full bg-accent hover:opacity-90 text-white font-semibold text-xs px-3.5 py-1.5 cursor-pointer transition-all"
            onClick={handleInstallClick}
          >
            Pasang Aplikasi
          </button>
          <button
            type="button"
            className="bg-transparent border-0 text-muted text-[13px] cursor-pointer px-1.5 py-1 underline hover:text-ink"
            onClick={() => setDeferredPrompt(null)}
          >
            Nanti
          </button>
        </div>
      </div>
    )
  }

  return null
}
