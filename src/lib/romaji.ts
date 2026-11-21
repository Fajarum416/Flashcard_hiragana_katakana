const MACRON: Record<string, string> = { ā: 'a', ī: 'i', ū: 'u', ē: 'e', ō: 'o' }

/** Normalisasi romaji agar variasi ejaan dianggap sama. */
export function norm(input: string): string {
  let s = input
    .toLowerCase()
    .replace(/[\s\-']/g, '')
    .replace(/[āīūēō]/g, (c) => MACRON[c])
  s = s
    .replace(/si/g, 'shi')
    .replace(/ti/g, 'chi')
    .replace(/tu/g, 'tsu')
    .replace(/hu/g, 'fu')
    .replace(/zi/g, 'ji')
    .replace(/di/g, 'ji')
    .replace(/du/g, 'zu')
    .replace(/nn/g, 'n')
    .replace(/(sh|ch)y/g, '$1')
    .replace(/sy/g, 'sh')
    .replace(/ty|cy/g, 'ch')
    .replace(/zy|jy/g, 'j')
  return s.replace(/(a)\1+|(i)\2+|(u)\3+|(e)\4+|(o)\5+/g, (m) => m[0])
}

export const accuracy = (correct: number, total: number): number =>
  total > 0 ? Math.round((correct / total) * 100) : 0
