import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const [showIOS, setShowIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) return

    // iOS detection
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)

    if (isIOS) {
      const hasSeenBanner = localStorage.getItem('ios-install-dismissed')
      if (!hasSeenBanner) {
        setShowIOS(true)
      }
    }

    // Android/Desktop Chrome install prompt
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
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--accent)',
          borderRadius: 12,
          padding: '12px 16px',
          margin: '12px auto',
          maxWidth: 1240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13,
        }}
      >
        <div>
          <strong>Install Kana Practice di iPhone/iPad:</strong> Ketuk tombol <strong>Share</strong>{' '}
          <span style={{ fontSize: 16 }}>⎋</span> di Safari, lalu pilih <strong>Add to Home Screen</strong> [+] untuk
          akses offline cepat.
        </div>
        <button
          className="link"
          style={{ whiteSpace: 'nowrap', textDecoration: 'none', color: 'var(--accent)', fontWeight: 600 }}
          onClick={dismissIOS}
        >
          Tutup ✕
        </button>
      </div>
    )
  }

  if (deferredPrompt) {
    return (
      <div
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: '10px 16px',
          margin: '12px auto',
          maxWidth: 1240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 13,
        }}
      >
        <div>Pasang Kana Practice sebagai aplikasi untuk latihan offline yang lancar.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ padding: '6px 14px', fontSize: 12 }} onClick={handleInstallClick}>
            Install App
          </button>
          <button className="link" onClick={() => setDeferredPrompt(null)}>
            Nanti
          </button>
        </div>
      </div>
    )
  }

  return null
}
