/**
 * Tests for content reference extraction.
 */

import { describe, it, expect } from 'vitest';

import { createSimpleReferenceExtractor } from './references';

describe('createSimpleReferenceExtractor', () => {
  const extractor = createSimpleReferenceExtractor();

  const entities = [
    { id: 'char-1', type: 'character', name: 'Alice' },
    { id: 'char-2', type: 'character', name: 'Bob' },
    { id: 'loc-1', type: 'location', name: 'The Castle' },
    { id: 'char-3', type: 'character', name: 'Alice Smith' },
  ];

  it('finds entity mentions by name', () => {
    const text = 'Alice went to see Bob at the castle.';
    const refs = extractor.extract(text, entities);

    const names = refs.map((r) => entities.find((e) => e.id === r.entityId)?.name);
    expect(names).toContain('Alice');
    expect(names).toContain('Bob');
  });

  it('is case insensitive', () => {
    const text = 'ALICE talked to bob.';
    const refs = extractor.extract(text, entities);

    expect(refs).toHaveLength(2);
  });

  it('respects word boundaries', () => {
    const text = 'Aliceville is not where Alice lives.';
    const refs = extractor.extract(text, entities);

    // Should only match "Alice", not "Aliceville"
    expect(refs).toHaveLength(1);
    expect(refs[0].entityId).toBe('char-1');
  });

  it('tracks positions correctly', () => {
    const text = 'Hello Alice!';
    const refs = extractor.extract(text, entities);

    expect(refs).toHaveLength(1);
    expect(refs[0].position.start).toBe(6);
    expect(refs[0].position.end).toBe(11);
  });

  it('finds multiple mentions of same entity', () => {
    const text = 'Alice talked to Bob. Then Alice left.';
    const refs = extractor.extract(text, entities);

    const aliceRefs = refs.filter((r) => r.entityId === 'char-1');
    expect(aliceRefs).toHaveLength(2);
  });

  it('handles multi-word names', () => {
    const text = 'They went to The Castle.';
    const refs = extractor.extract(text, entities);

    expect(refs).toHaveLength(1);
    expect(refs[0].entityId).toBe('loc-1');
  });

  it('handles overlapping matches by keeping longer', () => {
    const text = 'Alice Smith arrived.';
    const refs = extractor.extract(text, entities);

    // Should match "Alice Smith" not just "Alice"
    expect(refs).toHaveLength(1);
    expect(refs[0].entityId).toBe('char-3');
  });

  it('returns empty array for no matches', () => {
    const text = 'Nobody we know is here.';
    const refs = extractor.extract(text, entities);

    expect(refs).toEqual([]);
  });

  it('returns empty array for empty text', () => {
    const refs = extractor.extract('', entities);
    expect(refs).toEqual([]);
  });

  it('returns empty array for no entities', () => {
    const refs = extractor.extract('Alice and Bob', []);
    expect(refs).toEqual([]);
  });
});
