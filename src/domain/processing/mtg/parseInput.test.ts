import { describe, it, expect } from 'vitest'
import { parseMtgLine, parseMtgInput } from './parseInput'

describe('parseMtgLine', () => {
  it('parses a full Scryfall URL', () => {
    const entry = parseMtgLine('https://scryfall.com/card/m10/150/lightning-bolt')
    expect(entry).toEqual({
      raw: 'https://scryfall.com/card/m10/150/lightning-bolt',
      url: 'https://scryfall.com/card/m10/150/lightning-bolt',
      setCode: 'm10',
      collectorNumber: '150'
    })
  })

  it('parses a Scryfall URL with http (not https)', () => {
    const entry = parseMtgLine('http://scryfall.com/card/neo/238/the-wandering-emperor')
    expect(entry?.url).toBe('http://scryfall.com/card/neo/238/the-wandering-emperor')
    expect(entry?.setCode).toBe('neo')
    expect(entry?.collectorNumber).toBe('238')
  })

  it('parses a fully-qualified comma row', () => {
    expect(parseMtgLine('Lightning Bolt, M10, 150')).toEqual({
      raw: 'Lightning Bolt, M10, 150',
      name: 'Lightning Bolt',
      setCode: 'M10',
      collectorNumber: '150'
    })
  })

  it('parses a name + set row (no collector number)', () => {
    expect(parseMtgLine('Sol Ring, c21')).toEqual({
      raw: 'Sol Ring, c21',
      name: 'Sol Ring',
      setCode: 'c21',
      collectorNumber: undefined
    })
  })

  it('parses a bare name (search-only)', () => {
    expect(parseMtgLine('Black Lotus')).toEqual({
      raw: 'Black Lotus',
      name: 'Black Lotus',
      setCode: undefined,
      collectorNumber: undefined
    })
  })

  it('trims whitespace around commas', () => {
    expect(parseMtgLine('  Lightning Bolt  ,   M10   ,  150  ')).toEqual({
      raw: 'Lightning Bolt  ,   M10   ,  150',
      name: 'Lightning Bolt',
      setCode: 'M10',
      collectorNumber: '150'
    })
  })

  it('returns null for empty lines', () => {
    expect(parseMtgLine('')).toBeNull()
    expect(parseMtgLine('   ')).toBeNull()
    expect(parseMtgLine('\t')).toBeNull()
  })

  it('returns null for comment lines starting with #', () => {
    expect(parseMtgLine('# this is a comment')).toBeNull()
    expect(parseMtgLine('  # indented comment')).toBeNull()
  })
})

describe('parseMtgInput', () => {
  it('parses multiple lines, skipping blanks and comments', () => {
    const input = `Lightning Bolt, M10, 150
# this is a comment

Sol Ring, c21, 263
https://scryfall.com/card/neo/238/the-wandering-emperor`

    const entries = parseMtgInput(input)
    expect(entries).toHaveLength(3)
    expect(entries[0].name).toBe('Lightning Bolt')
    expect(entries[1].name).toBe('Sol Ring')
    expect(entries[2].url).toBe('https://scryfall.com/card/neo/238/the-wandering-emperor')
  })

  it('handles Windows CRLF line endings', () => {
    const input = 'Lightning Bolt, M10, 150\r\nSol Ring, c21, 263\r\n'
    expect(parseMtgInput(input)).toHaveLength(2)
  })

  it('returns an empty list for empty / whitespace input', () => {
    expect(parseMtgInput('')).toEqual([])
    expect(parseMtgInput('   \n  \n\t')).toEqual([])
  })
})
