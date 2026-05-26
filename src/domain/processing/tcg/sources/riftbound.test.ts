import { describe, it, expect } from 'vitest'
import { riftboundSource } from './riftbound'
import { parseDeckList, expandByCount } from '../types'

const parseLine = riftboundSource.parseLine.bind(riftboundSource)

describe('riftboundSource.parseLine — ID format', () => {
  it('parses a bare ID: "OGN-001"', () => {
    expect(parseLine('OGN-001')).toMatchObject({
      raw: 'OGN-001',
      setCode: 'OGN',
      collectorNumber: '001',
      count: 1
    })
  })

  it('normalises a 1-2 digit number to 3-digit padding', () => {
    expect(parseLine('OGN-7')).toMatchObject({ collectorNumber: '007' })
    expect(parseLine('OGN-42')).toMatchObject({ collectorNumber: '042' })
  })

  it('upper-cases the set code', () => {
    expect(parseLine('ogn-001')).toMatchObject({ setCode: 'OGN' })
  })

  it('strips a leading count: "3 OGN-007"', () => {
    expect(parseLine('3 OGN-007')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '007',
      count: 3
    })
  })

  it('strips a leading count with "x" suffix', () => {
    expect(parseLine('4x UNL-015')).toMatchObject({ count: 4 })
  })

  it('canonicalises a/b suffix to the base ID', () => {
    // CDN serves OGN-007.webp (front) and OGN-007b.webp (back). The parser
    // drops the suffix; fetchCard probes both URLs in parallel.
    expect(parseLine('OGN-007a')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '007'
    })
    expect(parseLine('OGN-007b')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '007'
    })
  })
})

describe('riftboundSource.parseLine — name format', () => {
  it('resolves a known name via the baked index', () => {
    // "Plundering Poro" is in riftbound-index.json. The exact ID depends on
    // what the index resolved it to; we just assert it parsed *something*.
    const entry = parseLine('3 Plundering Poro')
    expect(entry).not.toBeNull()
    expect(entry?.count).toBe(3)
    expect(entry?.setCode).toMatch(/^[A-Z]+$/)
  })

  it('returns null for a name not in the index (with warning)', () => {
    expect(parseLine('1 Definitely Not A Card 123')).toBeNull()
  })
})

describe('riftboundSource.parseLine — ignored lines', () => {
  it('returns null for empty / whitespace / comment lines', () => {
    expect(parseLine('')).toBeNull()
    expect(parseLine('   ')).toBeNull()
    expect(parseLine('# comment')).toBeNull()
  })

  it('returns null for .txt export section headers', () => {
    expect(parseLine('Legend:')).toBeNull()
    expect(parseLine('Champion:')).toBeNull()
    expect(parseLine('MainDeck:')).toBeNull()
    expect(parseLine('Battlefields:')).toBeNull()
    expect(parseLine('Rune Pool:')).toBeNull()
    expect(parseLine('Sideboard:')).toBeNull()
  })
})

describe('parseDeckList with riftboundSource — .txt export format', () => {
  it('drops section headers and blanks, keeps ID lines', () => {
    const input = `Legend:
1 OGN-001

MainDeck:
3 OGN-007
UNL-015`
    const entries = parseDeckList(input, riftboundSource)
    expect(entries).toHaveLength(3)
    expect(entries.map(e => e.count)).toEqual([1, 3, 1])
  })

  it('handles CRLF line endings', () => {
    expect(parseDeckList('OGN-001\r\nUNL-015\r\n', riftboundSource)).toHaveLength(2)
  })

  it('drops unknown names (no name auto-search fallback)', () => {
    const input = `OGN-001
not a real card
UNL-015`
    const entries = parseDeckList(input, riftboundSource)
    expect(entries.map(e => e.raw)).toEqual(['OGN-001', 'UNL-015'])
  })
})

describe('expandByCount', () => {
  it('repeats entries according to their count field', () => {
    const entries = [
      { raw: 'a', count: 3 },
      { raw: 'b', count: 1 },
      { raw: 'c', count: 2 }
    ]
    const expanded = expandByCount(entries)
    expect(expanded).toHaveLength(6)
    expect(expanded.map(e => e.raw)).toEqual(['a', 'a', 'a', 'b', 'c', 'c'])
  })

  it('treats count < 1 as 1', () => {
    const entries = [
      { raw: 'a', count: 0 },
      { raw: 'b', count: -2 }
    ]
    expect(expandByCount(entries)).toHaveLength(2)
  })
})
