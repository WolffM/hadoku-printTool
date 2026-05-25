import { describe, it, expect } from 'vitest'
import { riftboundSource } from './riftbound'
import { parseDeckList, expandByCount } from '../types'

const parseLine = riftboundSource.parseLine.bind(riftboundSource)

describe('riftboundSource.parseLine', () => {
  it('parses a bare ID: "OGN-001"', () => {
    expect(parseLine('OGN-001')).toMatchObject({
      raw: 'OGN-001',
      setCode: 'OGN',
      collectorNumber: '001',
      count: 1
    })
  })

  it('normalises a 1-2 digit number to 3-digit padding', () => {
    expect(parseLine('OGN-7')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '007'
    })
    expect(parseLine('OGN-42')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '042'
    })
  })

  it('upper-cases the set code', () => {
    expect(parseLine('ogn-001')).toMatchObject({ setCode: 'OGN' })
    expect(parseLine('Ogn-001')).toMatchObject({ setCode: 'OGN' })
  })

  it('strips a leading count: "3 OGN-007"', () => {
    expect(parseLine('3 OGN-007')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '007',
      count: 3
    })
  })

  it('strips a leading count with "x" suffix: "4x UNL-015"', () => {
    expect(parseLine('4x UNL-015')).toMatchObject({
      setCode: 'UNL',
      collectorNumber: '015',
      count: 4
    })
  })

  it('accepts an explicit a/b suffix but drops it (always reaches via base ID)', () => {
    // CDN serves "OGN-007.webp" (front) and "OGN-007b.webp" (back). The
    // parser canonicalises to the base ID; fetchCard probes both.
    expect(parseLine('OGN-007a')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '007'
    })
    expect(parseLine('OGN-007b')).toMatchObject({
      setCode: 'OGN',
      collectorNumber: '007'
    })
  })

  it('returns null for empty / comment / malformed lines', () => {
    expect(parseLine('')).toBeNull()
    expect(parseLine('   ')).toBeNull()
    expect(parseLine('# comment')).toBeNull()
    expect(parseLine('Lightning Bolt')).toBeNull() // not an ID
    expect(parseLine('OGN')).toBeNull() // no number
    expect(parseLine('001')).toBeNull() // no set
  })
})

describe('parseDeckList with riftboundSource', () => {
  it('parses a multi-line deck', () => {
    const input = `OGN-001
# Comment

3 OGN-007
UNL-015`

    const entries = parseDeckList(input, riftboundSource)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toMatchObject({ setCode: 'OGN', collectorNumber: '001', count: 1 })
    expect(entries[1]).toMatchObject({ setCode: 'OGN', collectorNumber: '007', count: 3 })
    expect(entries[2]).toMatchObject({ setCode: 'UNL', collectorNumber: '015', count: 1 })
  })

  it('handles Windows CRLF line endings', () => {
    expect(parseDeckList('OGN-001\r\nUNL-015\r\n', riftboundSource)).toHaveLength(2)
  })

  it('silently drops malformed lines (no name-lookup fallback)', () => {
    const input = `OGN-001
not a real card
UNL-015`
    const entries = parseDeckList(input, riftboundSource)
    expect(entries).toHaveLength(2)
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
