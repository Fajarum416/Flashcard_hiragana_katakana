let jaVoice: SpeechSynthesisVoice | null = null

function getJaVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  if (jaVoice) return jaVoice

  const voices = window.speechSynthesis.getVoices()
  jaVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith('ja') || v.lang.toLowerCase().replace('_', '-').startsWith('ja')) ??
    null

  return jaVoice
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    jaVoice = null
    getJaVoice()
  }
}

/** Mengecek apakah browser mendukung Web Speech API synthesis. */
export function isAudioSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Memutar pelafalan audio bahasa Jepang untuk huruf atau kata kana. */
export function playKana(text: string): boolean {
  if (!isAudioSupported()) return false

  try {
    window.speechSynthesis.cancel() // Hentikan audio sebelumnya jika ada
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ja-JP'
    utter.rate = 0.9 // Kecepatan sedikit santai agar artikulasi jelas bagi pemelajar
    const voice = getJaVoice()
    if (voice) utter.voice = voice

    window.speechSynthesis.speak(utter)
    return true
  } catch (err) {
    console.warn('[audio] speech synthesis error:', err)
    return false
  }
}
