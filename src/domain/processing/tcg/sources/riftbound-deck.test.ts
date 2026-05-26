/**
 * Tests for the deck-editor parser. Only the pure parsing path is covered
 * here — the prefetch step hits a live CDN and is verified manually.
 */

import { describe, it, expect } from 'vitest'
import { parseDeckForEditor } from './riftbound-deck'

describe('parseDeckForEditor — name format', () => {
  it('resolves a name to its full variants list', () => {
    // "Calm Rune" is in the index with 3 known printings (OGN-042, -042a, -042b).
    const { slots, missing } = parseDeckForEditor('1 Calm Rune')
    expect(missing).toEqual([])
    expect(slots).toHaveLength(1)
    expect(slots[0].name).toBe('Calm Rune')
    expect(slots[0].variants.length).toBeGreaterThan(1)
    expect(slots[0].variants).toContain('OGN-042')
    expect(slots[0].selectedId).toBe('OGN-042') // primary index = lowest sort
  })

  it('expands by count: 3× Plundering Poro → 3 slots', () => {
    const { slots } = parseDeckForEditor('3 Plundering Poro')
    expect(slots).toHaveLength(3)
    // Every slot points at the same name + same default variant.
    expect(new Set(slots.map(s => s.name))).toEqual(new Set(['Plundering Poro']))
    expect(new Set(slots.map(s => s.selectedId))).toEqual(new Set([slots[0].selectedId]))
  })

  it('returns missing for names not in the index', () => {
    const { slots, missing } = parseDeckForEditor('1 Definitely Not A Card 123')
    expect(slots).toEqual([])
    expect(missing).toEqual(['1 Definitely Not A Card 123'])
  })
})

describe('parseDeckForEditor — ID format', () => {
  it('backsolves name from ID and surfaces all known variants', () => {
    // OGN-042 is one variant of "Calm Rune"; the editor should still show
    // all three Calm Rune variants in the dropdown.
    const { slots } = parseDeckForEditor('OGN-042')
    expect(slots).toHaveLength(1)
    expect(slots[0].selectedId).toBe('OGN-042')
    expect(slots[0].name).toBe('Calm Rune')
    expect(slots[0].variants.length).toBeGreaterThan(1)
  })

  it('keeps the explicit variant when user wrote `OGN-042b`', () => {
    const { slots } = parseDeckForEditor('OGN-042b')
    expect(slots[0].selectedId).toBe('OGN-042b')
  })

  it('normalises set + number padding for IDs', () => {
    const { slots } = parseDeckForEditor('ogn-42')
    expect(slots[0].selectedId).toBe('OGN-042')
  })
})

describe('parseDeckForEditor — formatting edge cases', () => {
  it('drops .txt-format section headers and blanks', () => {
    const input = `Legend:
1 Ahri, Nine-Tailed Fox

MainDeck:
3 Plundering Poro`
    const { slots } = parseDeckForEditor(input)
    expect(slots).toHaveLength(4)
    expect(slots[0].name).toBe('Ahri, Nine-Tailed Fox')
    expect(slots.slice(1).every(s => s.name === 'Plundering Poro')).toBe(true)
  })

  it('handles CRLF line endings', () => {
    const { slots } = parseDeckForEditor('1 Plundering Poro\r\n3 Calm Rune\r\n')
    expect(slots).toHaveLength(4)
  })

  it('drops comment lines', () => {
    const { slots } = parseDeckForEditor(`# sideboard
1 Plundering Poro`)
    expect(slots).toHaveLength(1)
  })
})

describe('parseDeckForEditor — variant ordering', () => {
  it('puts the black-bordered original (no suffix) first in the variants list', () => {
    const { slots } = parseDeckForEditor('1 Calm Rune')
    expect(slots[0].variants[0]).toBe('OGN-042')
    // Suffixed variants come after.
    expect(slots[0].variants.slice(1).every(v => /[a-z]$/.test(v))).toBe(true)
  })
})
