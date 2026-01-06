import { describe, expect, it } from 'vitest';

import {
  NarrativePromiseSchema,
  PlotThreadSchema,
  PlotThreadSummarySchema,
  PlotThreadTypeSchema,
  ThreadTouchSchema,
} from './plot-thread';

describe('NarrativePromiseSchema', () => {
  it('validates a complete promise', () => {
    const promise = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'The hero will confront the villain',
      madeAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440001',
        chapterNumber: 5,
      },
      fulfilledAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440002',
        chapterNumber: 20,
      },
      expectedPayoff: 'long-term',
      status: 'fulfilled',
    };
    const result = NarrativePromiseSchema.safeParse(promise);
    expect(result.success).toBe(true);
  });

  it('validates unfulfilled promise', () => {
    const promise = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'The mystery will be solved',
      madeAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440001',
      },
      expectedPayoff: 'series-end',
      status: 'pending',
    };
    const result = NarrativePromiseSchema.safeParse(promise);
    expect(result.success).toBe(true);
  });

  it('validates all expected payoff values', () => {
    const payoffs = ['immediate', 'short-term', 'medium-term', 'long-term', 'series-end'] as const;
    for (const expectedPayoff of payoffs) {
      const promise = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Promise description',
        madeAt: { contentId: '550e8400-e29b-41d4-a716-446655440001' },
        expectedPayoff,
        status: 'pending' as const,
      };
      const result = NarrativePromiseSchema.safeParse(promise);
      expect(result.success).toBe(true);
    }
  });

  it('validates all promise statuses', () => {
    const statuses = ['pending', 'fulfilled', 'subverted', 'abandoned'] as const;
    for (const status of statuses) {
      const promise = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Promise description',
        madeAt: { contentId: '550e8400-e29b-41d4-a716-446655440001' },
        expectedPayoff: 'medium-term' as const,
        status,
      };
      const result = NarrativePromiseSchema.safeParse(promise);
      expect(result.success).toBe(true);
    }
  });
});

describe('ThreadTouchSchema', () => {
  it('validates a valid thread touch', () => {
    const touch = {
      contentId: '550e8400-e29b-41d4-a716-446655440001',
      chapterNumber: 10,
      type: 'development',
      description: 'The plot advances significantly',
    };
    const result = ThreadTouchSchema.safeParse(touch);
    expect(result.success).toBe(true);
  });

  it('validates all touch types', () => {
    const types = ['introduction', 'development', 'complication', 'climax', 'resolution'] as const;
    for (const type of types) {
      const touch = {
        contentId: '550e8400-e29b-41d4-a716-446655440001',
        type,
        description: `${type} description`,
      };
      const result = ThreadTouchSchema.safeParse(touch);
      expect(result.success).toBe(true);
    }
  });
});

describe('PlotThreadTypeSchema', () => {
  it('accepts all valid types', () => {
    const types = [
      'main-plot',
      'subplot',
      'mystery',
      'romance',
      'conflict',
      'character-arc',
      'worldbuilding',
      'other',
    ];
    for (const type of types) {
      const result = PlotThreadTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = PlotThreadTypeSchema.safeParse('action');
    expect(result.success).toBe(false);
  });
});

describe('PlotThreadSchema', () => {
  const validThread = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    entityType: 'plot-thread' as const,
    name: 'The Dark Lord Returns',
    description: 'Main antagonist awakening arc',
    type: 'main-plot' as const,
    status: 'active' as const,
    scope: 'series' as const,
    priority: 100,
    involvedCharacters: ['550e8400-e29b-41d4-a716-446655440003'],
    relatedLocations: ['550e8400-e29b-41d4-a716-446655440004'],
    promises: [
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        description: 'The dark lord will rise',
        madeAt: { contentId: '550e8400-e29b-41d4-a716-446655440006' },
        expectedPayoff: 'long-term' as const,
        status: 'pending' as const,
      },
    ],
    touches: [
      {
        contentId: '550e8400-e29b-41d4-a716-446655440006',
        chapterNumber: 1,
        type: 'introduction' as const,
        description: 'First signs of the dark lord',
      },
    ],
    childThreads: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete plot thread', () => {
    const result = PlotThreadSchema.safeParse(validThread);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const threadWithoutType = {
      id: validThread.id,
      name: validThread.name,
      description: validThread.description,
      type: validThread.type,
      status: validThread.status,
      scope: validThread.scope,
      priority: validThread.priority,
      involvedCharacters: validThread.involvedCharacters,
      relatedLocations: validThread.relatedLocations,
      promises: validThread.promises,
      touches: validThread.touches,
      childThreads: validThread.childThreads,
      createdAt: validThread.createdAt,
      updatedAt: validThread.updatedAt,
    };
    const result = PlotThreadSchema.safeParse(threadWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('plot-thread');
    }
  });

  it('allows spine position fields', () => {
    const threadWithSpine = {
      ...validThread,
      spineIntroducedAt: { nodeId: 'chapter-1', order: 0 },
      spineRetiredAt: { nodeId: 'chapter-30', order: 5 },
    };
    const result = PlotThreadSchema.safeParse(threadWithSpine);
    expect(result.success).toBe(true);
  });

  it('allows content-based tracking fields', () => {
    const threadWithContent = {
      ...validThread,
      introducedAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440010',
        chapterNumber: 1,
      },
      resolvedAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440011',
        chapterNumber: 30,
      },
    };
    const result = PlotThreadSchema.safeParse(threadWithContent);
    expect(result.success).toBe(true);
  });

  it('validates all thread statuses', () => {
    const statuses = ['planned', 'active', 'dormant', 'resolved', 'abandoned'] as const;
    for (const status of statuses) {
      const thread = { ...validThread, status };
      const result = PlotThreadSchema.safeParse(thread);
      expect(result.success).toBe(true);
    }
  });

  it('validates all scope values', () => {
    const scopes = ['scene', 'chapter', 'arc', 'book', 'series'] as const;
    for (const scope of scopes) {
      const thread = { ...validThread, scope };
      const result = PlotThreadSchema.safeParse(thread);
      expect(result.success).toBe(true);
    }
  });

  it('rejects priority above 100', () => {
    const invalid = { ...validThread, priority: 150 };
    const result = PlotThreadSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative priority', () => {
    const invalid = { ...validThread, priority: -10 };
    const result = PlotThreadSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const invalid = { ...validThread, name: '' };
    const result = PlotThreadSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('allows parent thread reference', () => {
    const childThread = {
      ...validThread,
      parentThreadId: '550e8400-e29b-41d4-a716-446655440020',
    };
    const result = PlotThreadSchema.safeParse(childThread);
    expect(result.success).toBe(true);
  });
});

describe('PlotThreadSummarySchema', () => {
  it('validates a valid summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'The Dark Lord Returns',
      type: 'main-plot' as const,
      status: 'active' as const,
      priority: 100,
      brief: 'Main antagonist awakening arc',
    };
    const result = PlotThreadSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});
