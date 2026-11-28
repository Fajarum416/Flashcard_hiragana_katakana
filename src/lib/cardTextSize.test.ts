import { describe, it, expect } from 'vitest'
import {
  getVocabPrimarySize,
  getVocabSubSize,
  getVocabBackPrimarySize,
  getVocabMeaningSize,
  getAdminVocabPrimarySize,
  getAdminVocabSubSize,
  getAdminMeaningSize,
} from './cardTextSize'

describe('cardTextSize', () => {
  it('scales student vocab primary text down as character length grows', () => {
    expect(getVocabPrimarySize('')).toBe('text-5xl sm:text-7xl md:text-8xl')
    expect(getVocabPrimarySize('先生')).toBe('text-5xl sm:text-7xl md:text-8xl')
    expect(getVocabPrimarySize('としょかん')).toBe('text-4xl sm:text-5xl md:text-6xl')
    expect(getVocabPrimarySize('おめでとうございます')).toBe('text-2xl sm:text-4xl md:text-5xl')
    expect(getVocabPrimarySize('ありがとうございますございます')).toBe('text-xl sm:text-3xl md:text-4xl')
    expect(getVocabPrimarySize('あいうえおかきくけこさしすせそたちつてとな')).toBe('text-lg sm:text-2xl md:text-3xl')
  })

  it('scales student vocab sub text and back primary text', () => {
    expect(getVocabSubSize('せんせい')).toBe('text-2xl sm:text-3xl md:text-4xl')
    expect(getVocabSubSize('おめでとうございます')).toBe('text-lg sm:text-2xl md:text-3xl')
    expect(getVocabSubSize('あいうえおかきくけこさしすせそたち')).toBe('text-base sm:text-xl md:text-2xl')

    expect(getVocabBackPrimarySize('先生')).toBe('text-3xl sm:text-4xl md:text-5xl')
    expect(getVocabBackPrimarySize('だいがくせい')).toBe('text-3xl sm:text-4xl md:text-5xl')
    expect(getVocabBackPrimarySize('おめでとうございます')).toBe('text-2xl sm:text-3xl md:text-4xl')
    expect(getVocabBackPrimarySize('あいうえおかきくけこさしす')).toBe('text-xl sm:text-2xl md:text-3xl')
  })

  it('scales student meaning text across short to very long descriptions', () => {
    expect(getVocabMeaningSize('Guru')).toBe('text-2xl sm:text-3xl md:text-4xl')
    expect(getVocabMeaningSize('Selamat pagi (sopan)')).toBe('text-xl sm:text-2xl md:text-3xl')
    expect(getVocabMeaningSize('Mengucapkan selamat atas pencapaian atau hari spesial')).toBe(
      'text-lg sm:text-xl md:text-2xl',
    )
    expect(
      getVocabMeaningSize(
        'Ungkapan sopan yang digunakan untuk menyampaikan rasa terima kasih yang mendalam kepada seseorang',
      ),
    ).toBe('text-base sm:text-lg md:text-xl')
  })

  it('scales admin grid card text sizes for compact cards', () => {
    expect(getAdminVocabPrimarySize('先生')).toBe('text-2xl sm:text-3xl')
    expect(getAdminVocabPrimarySize('としょかん')).toBe('text-2xl sm:text-3xl')
    expect(getAdminVocabPrimarySize('おはようござい')).toBe('text-xl sm:text-2xl')
    expect(getAdminVocabPrimarySize('おめでとうございます')).toBe('text-xl sm:text-2xl')
    expect(getAdminVocabPrimarySize('ありがとうございます！')).toBe('text-base sm:text-lg')
    expect(getAdminVocabPrimarySize('あいうえおかきくけこさしすせそたち')).toBe('text-sm sm:text-base')

    expect(getAdminVocabSubSize('せんせい')).toBe('text-sm')
    expect(getAdminVocabSubSize('おはようございますございます')).toBe('text-xs')

    expect(getAdminMeaningSize('Guru')).toBe('text-base sm:text-lg')
    expect(getAdminMeaningSize('Selamat pagi untuk situasi formal')).toBe('text-sm sm:text-base')
    expect(getAdminMeaningSize('Ungkapan yang sangat panjang untuk menjelaskan arti kata')).toBe(
      'text-xs sm:text-sm',
    )
  })
})
