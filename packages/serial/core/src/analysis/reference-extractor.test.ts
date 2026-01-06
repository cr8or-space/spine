import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProseReferenceExtractor,
  CompositeReferenceExtractor,
  DEFAULT_PROSE_EXTRACTOR_CONFIG,
  type EntityRegistry,
  type EntityInfo,
} from './reference-extractor';

/** Mock entity registry for testing */
class MockEntityRegistry implements EntityRegistry {
  private entities: Map<string, EntityInfo[]> = new Map();

  addEntity(entity: EntityInfo): void {
    const existing = this.entities.get(entity.type) ?? [];
    existing.push(entity);
    this.entities.set(entity.type, existing);
  }

  getEntitiesByType(type: string): EntityInfo[] {
    return this.entities.get(type) ?? [];
  }

  getEntityTypes(): string[] {
    return Array.from(this.entities.keys());
  }
}

describe('ProseReferenceExtractor', () => {
  let registry: MockEntityRegistry;

  beforeEach(() => {
    registry = new MockEntityRegistry();
  });

  describe('extract', () => {
    it('should find character name in text', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Alice',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('Alice walked into the room.');

      expect(references).toHaveLength(1);
      expect(references[0]).toEqual({
        entityId: 'char-1',
        entityType: 'character',
        position: { start: 0, end: 5 },
      });
    });

    it('should find multiple occurrences of the same name', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Bob',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract(
        'Bob met with Bob to discuss the plan.'
      );

      expect(references).toHaveLength(2);
      expect(references[0].position).toEqual({ start: 0, end: 3 });
      expect(references[1].position).toEqual({ start: 13, end: 16 });
    });

    it('should find aliases', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Elizabeth',
        aliases: ['Beth', 'Liz'],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('Elizabeth, or Beth as friends call her.');

      expect(references).toHaveLength(2);
      expect(references[0].entityId).toBe('char-1');
      expect(references[1].entityId).toBe('char-1');
    });

    it('should handle multiple entity types', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'John',
        aliases: [],
      });
      registry.addEntity({
        id: 'loc-1',
        type: 'location',
        name: 'New York',
        aliases: ['NYC'],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('John traveled to New York.');

      expect(references).toHaveLength(2);
      expect(references[0].entityType).toBe('character');
      expect(references[1].entityType).toBe('location');
    });

    it('should match whole words only by default', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Art',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('The art gallery featured Art.');

      expect(references).toHaveLength(1);
      expect(references[0].position.start).toBe(25); // Only the capitalized "Art"
    });

    it('should match substrings when wholeWordOnly is false', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Art',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry, {
        wholeWordOnly: false,
        caseInsensitive: true,
      });
      const references = extractor.extract('The art gallery featured Art.');

      expect(references).toHaveLength(2);
      expect(references[0].position.start).toBe(4); // "art" in "art gallery"
      expect(references[1].position.start).toBe(25); // "Art" at the end
    });

    it('should support case-insensitive matching', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Alice',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry, {
        caseInsensitive: true,
      });
      const references = extractor.extract('alice and ALICE both refer to Alice.');

      expect(references).toHaveLength(3);
    });

    it('should filter by entity types when configured', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'John',
        aliases: [],
      });
      registry.addEntity({
        id: 'loc-1',
        type: 'location',
        name: 'Paris',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry, {
        entityTypes: ['character'],
      });
      const references = extractor.extract('John visited Paris.');

      expect(references).toHaveLength(1);
      expect(references[0].entityType).toBe('character');
    });

    it('should skip names shorter than minNameLength', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Jo',
        aliases: ['J'],
      });

      const extractor = new ProseReferenceExtractor(registry, {
        minNameLength: 2,
      });
      const references = extractor.extract('Jo and J went out.');

      expect(references).toHaveLength(1);
      expect(references[0].position).toEqual({ start: 0, end: 2 });
    });

    it('should handle overlapping matches by keeping the first', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'New York',
        aliases: [],
      });
      registry.addEntity({
        id: 'char-2',
        type: 'character',
        name: 'York',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('Visit New York today.');

      // Should keep "New York" (longer) and skip "York" (overlaps)
      expect(references).toHaveLength(1);
      expect(references[0].entityId).toBe('char-1');
    });

    it('should return empty array for no matches', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Alice',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('Bob walked alone.');

      expect(references).toHaveLength(0);
    });

    it('should handle empty text', () => {
      registry.addEntity({
        id: 'char-1',
        type: 'character',
        name: 'Alice',
        aliases: [],
      });

      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('');

      expect(references).toHaveLength(0);
    });

    it('should handle empty registry', () => {
      const extractor = new ProseReferenceExtractor(registry);
      const references = extractor.extract('Alice walked into the room.');

      expect(references).toHaveLength(0);
    });
  });
});

describe('CompositeReferenceExtractor', () => {
  it('should combine results from multiple extractors', () => {
    const registry1 = new MockEntityRegistry();
    registry1.addEntity({
      id: 'char-1',
      type: 'character',
      name: 'Alice',
      aliases: [],
    });

    const registry2 = new MockEntityRegistry();
    registry2.addEntity({
      id: 'loc-1',
      type: 'location',
      name: 'Paris',
      aliases: [],
    });

    const extractor1 = new ProseReferenceExtractor(registry1);
    const extractor2 = new ProseReferenceExtractor(registry2);
    const composite = new CompositeReferenceExtractor([extractor1, extractor2]);

    const references = composite.extract('Alice visited Paris.');

    expect(references).toHaveLength(2);
    expect(references.map((r) => r.entityId)).toContain('char-1');
    expect(references.map((r) => r.entityId)).toContain('loc-1');
  });

  it('should deduplicate identical references', () => {
    const registry = new MockEntityRegistry();
    registry.addEntity({
      id: 'char-1',
      type: 'character',
      name: 'Alice',
      aliases: [],
    });

    // Both extractors have the same registry
    const extractor1 = new ProseReferenceExtractor(registry);
    const extractor2 = new ProseReferenceExtractor(registry);
    const composite = new CompositeReferenceExtractor([extractor1, extractor2]);

    const references = composite.extract('Alice walked.');

    expect(references).toHaveLength(1);
  });

  it('should sort results by position', () => {
    const registry1 = new MockEntityRegistry();
    registry1.addEntity({
      id: 'char-1',
      type: 'character',
      name: 'Charlie',
      aliases: [],
    });

    const registry2 = new MockEntityRegistry();
    registry2.addEntity({
      id: 'char-2',
      type: 'character',
      name: 'Alice',
      aliases: [],
    });

    const extractor1 = new ProseReferenceExtractor(registry1);
    const extractor2 = new ProseReferenceExtractor(registry2);
    const composite = new CompositeReferenceExtractor([extractor1, extractor2]);

    const references = composite.extract('Alice met Charlie.');

    expect(references[0].entityId).toBe('char-2'); // Alice comes first
    expect(references[1].entityId).toBe('char-1'); // Charlie comes second
  });
});

describe('DEFAULT_PROSE_EXTRACTOR_CONFIG', () => {
  it('should have expected default values', () => {
    expect(DEFAULT_PROSE_EXTRACTOR_CONFIG).toEqual({
      caseInsensitive: false,
      wholeWordOnly: true,
      minNameLength: 2,
      entityTypes: [],
    });
  });
});
