import { describe, expect, it } from 'vitest';

import { BibleSchema, BibleSummarySchema, createEmptyBible } from './bible';

describe('BibleSchema', () => {
  it('validates a complete bible', () => {
    const bible = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      characters: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          entityType: 'character' as const,
          name: 'Hero',
          aliases: [],
          description: 'The protagonist',
          traits: [],
          relationships: [],
          voiceSamples: [],
          appearances: [],
          role: 'protagonist' as const,
          status: 'active' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      locations: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          entityType: 'location' as const,
          name: 'Castle',
          aliases: [],
          description: 'A grand castle',
          type: 'building' as const,
          relations: [],
          features: [],
          associatedCharacters: [],
          status: 'accessible' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timelineEvents: [],
      timelineSpans: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    const result = BibleSchema.safeParse(bible);
    expect(result.success).toBe(true);
  });

  it('validates an empty bible', () => {
    const bible = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      characters: [],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timelineEvents: [],
      timelineSpans: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    const result = BibleSchema.safeParse(bible);
    expect(result.success).toBe(true);
  });

  it('validates bible with nested entity data', () => {
    const bible = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      characters: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          entityType: 'character' as const,
          name: 'Hero',
          aliases: ['The Chosen One'],
          description: 'A brave warrior',
          traits: [
            {
              category: 'personality' as const,
              name: 'Brave',
              description: 'Never backs down',
            },
          ],
          relationships: [
            {
              targetId: '550e8400-e29b-41d4-a716-446655440003',
              type: 'friend' as const,
              description: 'Best friends since childhood',
              intensity: 85,
              mutual: true,
            },
          ],
          arc: {
            type: 'positive-change' as const,
            startingPoint: 'Uncertain',
            destination: 'Confident leader',
            progress: 30,
            milestones: [],
          },
          voiceSamples: ['I will protect everyone!'],
          appearances: [],
          role: 'protagonist' as const,
          status: 'active' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      locations: [],
      factions: [],
      worldRules: [
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          entityType: 'world-rule' as const,
          name: 'Magic Cost',
          description: 'All magic requires energy',
          category: 'magic' as const,
          rule: 'Using magic drains physical stamina',
          exceptions: [],
          relatedRules: [],
          priority: 70,
          publicKnowledge: true,
          established: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      plotThreads: [
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          entityType: 'plot-thread' as const,
          name: 'The Dark Lord Returns',
          description: 'Main antagonist awakening',
          type: 'main-plot' as const,
          status: 'active' as const,
          scope: 'series' as const,
          priority: 100,
          involvedCharacters: [],
          relatedLocations: [],
          promises: [],
          touches: [],
          childThreads: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      timelineEvents: [],
      timelineSpans: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    const result = BibleSchema.safeParse(bible);
    expect(result.success).toBe(true);
  });
});

describe('BibleSummarySchema', () => {
  it('validates a bible summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      characters: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Hero',
          aliases: [],
          role: 'protagonist' as const,
          status: 'active' as const,
          brief: 'The main character',
        },
      ],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timelineEvents: [],
    };
    const result = BibleSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('validates empty summary arrays', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      characters: [],
      locations: [],
      factions: [],
      worldRules: [],
      plotThreads: [],
      timelineEvents: [],
    };
    const result = BibleSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('createEmptyBible', () => {
  it('creates a valid empty bible', () => {
    const bible = createEmptyBible('550e8400-e29b-41d4-a716-446655440000');

    expect(bible.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(bible.characters).toEqual([]);
    expect(bible.locations).toEqual([]);
    expect(bible.factions).toEqual([]);
    expect(bible.worldRules).toEqual([]);
    expect(bible.plotThreads).toEqual([]);
    expect(bible.timelineEvents).toEqual([]);
    expect(bible.timelineSpans).toEqual([]);
    expect(bible.createdAt).toBeDefined();
    expect(bible.updatedAt).toBeDefined();
  });

  it('creates bible that validates against schema', () => {
    const bible = createEmptyBible('550e8400-e29b-41d4-a716-446655440000');
    const result = BibleSchema.safeParse(bible);
    expect(result.success).toBe(true);
  });
});
