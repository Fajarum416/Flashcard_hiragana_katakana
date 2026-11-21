import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { masteryLevel, percent, streak } from './mastery'

describe('masteryLevel', () => {
  it('none jika belum ada data', () => {
    expect(masteryLevel(undefined)).toBe('none')
    expect(masteryLevel({ ok: 0, no: 0, box: 1 })).toBe('none')
  })
  it('weak jika akurasi < 60%', () => {
    expect(masteryLevel({ ok: 1, no: 3, box: 1 })).toBe('weak')
    expect(masteryLevel({ ok: 5, no: 5, box: 4 })).toBe('weak')
  })
  it('mastered jika box >= 4 dan akurasi >= 80%', () => {
    expect(masteryLevel({ ok: 8, no: 2, box: 4 })).toBe('mastered')
    expect(masteryLevel({ ok: 10, no: 0, box: 5 })).toBe('mastered')
  })
  it('almost pada box 3', () => {
    expect(masteryLevel({ ok: 3, no: 0, box: 3 })).toBe('almost')
  })
  it('learning untuk sisanya', () => {
    expect(masteryLevel({ ok: 2, no: 0, box: 2 })).toBe('learning')
    expect(masteryLevel({ ok: 7, no: 3, box: 4 })).toBe('learning') // box tinggi tapi akurasi 70%
  })
})

describe('streak', () => {
  const now = new Date(2026, 10, 21, 15, 0)
  const d = (day: number) => new Date(2026, 10, day, 9, 0).toISOString()
  it('menghitung hari beruntun sampai hari ini', () => {
    expect(streak([d(21), d(20), d(19), d(17)], now)).toBe(3)
  })
  it('boleh dimulai dari kemarin', () => {
    expect(streak([d(20), d(19)], now)).toBe(2)
  })
  it('0 jika terakhir belajar lebih dari kemarin atau kosong', () => {
    expect(streak([d(18)], now)).toBe(0)
    expect(streak([], now)).toBe(0)
  })
  it('beberapa sesi di hari yang sama dihitung satu hari', () => {
    expect(streak([d(21), d(21), d(20)], now)).toBe(2)
  })
})

describe('toCsv', () => {
  it('meng-escape koma, kutip, dan baris baru', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['l1\nl2', 1]])).toBe('a,b\r\n"x,y","say ""hi"""\r\n"l1\nl2",1')
  })
  it('menetralkan rumus spreadsheet', () => {
    expect(toCsv(['n'], [['=SUM(A1)'], ['@cmd'], ['-1+1']])).toBe("n\r\n'=SUM(A1)\r\n'@cmd\r\n'-1+1")
  })
  it('null/undefined menjadi kosong', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,')
  })
})

describe('percent', () => {
  it('aman untuk pembagi 0', () => {
    expect(percent(26, 104)).toBe(25)
    expect(percent(1, 0)).toBe(0)
  })
})
