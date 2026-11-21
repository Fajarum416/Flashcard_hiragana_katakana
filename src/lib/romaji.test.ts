import { describe, expect, it } from 'vitest'
import { accuracy, norm } from './romaji'

describe('norm', () => {
  it('huruf kecil dan buang spasi/tanda hubung', () => {
    expect(norm('Sha')).toBe('sha')
    expect(norm(' k-a ')).toBe('ka')
  })
  it('makron dan vokal ganda dilipat', () => {
    expect(norm('kōhī')).toBe('kohi')
    expect(norm('koohii')).toBe('kohi')
  })
  it('ejaan Kunrei dianggap sama', () => {
    expect(norm('si')).toBe('shi')
    expect(norm('ti')).toBe('chi')
    expect(norm('tu')).toBe('tsu')
    expect(norm('hu')).toBe('fu')
    expect(norm('zi')).toBe('ji')
    expect(norm('du')).toBe('zu')
  })
  it('yoon alternatif', () => {
    expect(norm('sya')).toBe('sha')
    expect(norm('tya')).toBe('cha')
    expect(norm('cya')).toBe('cha')
    expect(norm('jya')).toBe('ja')
    expect(norm('zya')).toBe('ja')
  })
  it('nn menjadi n', () => {
    expect(norm('nn')).toBe('n')
  })
  it('sokuon konsonan ganda dipertahankan', () => {
    expect(norm('kitte')).toBe('kitte')
    expect(norm('gakkou')).toBe('gakko')
    expect(norm('gakkō')).toBe('gakko')
    expect(norm('kicchin')).toBe('kitchin')
    expect(norm('kitchin')).toBe('kitchin')
  })
  it('wo dan o dianggap sama', () => {
    expect(norm('wo')).toBe('o')
    expect(norm('o')).toBe('o')
  })
})

describe('accuracy', () => {
  it('membulatkan persen dan aman untuk total 0', () => {
    expect(accuracy(1, 3)).toBe(33)
    expect(accuracy(0, 0)).toBe(0)
  })
})
