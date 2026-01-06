import { describe, expect, it } from 'vitest';

import {
  CausalLinkSchema,
  TimelineEventSchema,
  TimelineEventSummarySchema,
  TimelineEventTypeSchema,
  TimelinePositionSchema,
  TimelineSpanSchema,
} from './timeline';

describe('TimelinePositionSchema', () => {
  it('validates position with date', () => {
    const position = {
      date: '2024-06-15',
      approximate: false,
    };
    const result = TimelinePositionSchema.safeParse(position);
    expect(result.success).toBe(true);
  });

  it('validates position with story time', () => {
    const position = {
      storyTime: 'Year 3, Month 2',
      chapterNumber: 15,
      approximate: true,
    };
    const result = TimelinePositionSchema.safeParse(position);
    expect(result.success).toBe(true);
  });

  it('applies default approximate value', () => {
    const position = {
      storyTime: 'Day 1',
    };
    const result = TimelinePositionSchema.safeParse(position);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.approximate).toBe(false);
    }
  });

  it('allows empty position (all optional)', () => {
    const result = TimelinePositionSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('CausalLinkSchema', () => {
  it('validates a valid causal link', () => {
    const link = {
      causeEventId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'direct',
      description: 'The explosion caused the building to collapse',
    };
    const result = CausalLinkSchema.safeParse(link);
    expect(result.success).toBe(true);
  });

  it('validates all causality types', () => {
    const types = ['direct', 'indirect', 'enables', 'prevents', 'triggers'] as const;
    for (const type of types) {
      const link = {
        causeEventId: '550e8400-e29b-41d4-a716-446655440000',
        type,
      };
      const result = CausalLinkSchema.safeParse(link);
      expect(result.success).toBe(true);
    }
  });

  it('allows link without description', () => {
    const link = {
      causeEventId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'triggers',
    };
    const result = CausalLinkSchema.safeParse(link);
    expect(result.success).toBe(true);
  });
});

describe('TimelineEventTypeSchema', () => {
  it('accepts all valid event types', () => {
    const types = ['backstory', 'flashback', 'current', 'flashforward', 'prophecy', 'hypothetical'];
    for (const type of types) {
      const result = TimelineEventTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = TimelineEventTypeSchema.safeParse('future');
    expect(result.success).toBe(false);
  });
});

describe('TimelineEventSchema', () => {
  const validEvent = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    entityType: 'timeline-event' as const,
    name: 'The Great War',
    description: 'The war that shaped the current political landscape',
    position: {
      storyTime: 'Year -100',
      approximate: false,
    },
    duration: '10 years',
    type: 'backstory' as const,
    significance: 'critical' as const,
    involvedCharacters: [],
    locations: ['550e8400-e29b-41d4-a716-446655440002'],
    relatedThreads: ['550e8400-e29b-41d4-a716-446655440003'],
    causes: [
      {
        causeEventId: '550e8400-e29b-41d4-a716-446655440004',
        type: 'triggers' as const,
        description: 'Border dispute escalated',
      },
    ],
    effects: ['550e8400-e29b-41d4-a716-446655440005'],
    revealed: true,
    contentRefs: ['550e8400-e29b-41d4-a716-446655440006'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete timeline event', () => {
    const result = TimelineEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const eventWithoutType = {
      id: validEvent.id,
      name: validEvent.name,
      description: validEvent.description,
      position: validEvent.position,
      type: validEvent.type,
      significance: validEvent.significance,
      involvedCharacters: validEvent.involvedCharacters,
      locations: validEvent.locations,
      relatedThreads: validEvent.relatedThreads,
      causes: validEvent.causes,
      effects: validEvent.effects,
      revealed: validEvent.revealed,
      contentRefs: validEvent.contentRefs,
      createdAt: validEvent.createdAt,
      updatedAt: validEvent.updatedAt,
    };
    const result = TimelineEventSchema.safeParse(eventWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('timeline-event');
    }
  });

  it('allows spine position fields', () => {
    const eventWithSpine = {
      ...validEvent,
      spineIntroducedAt: { nodeId: 'chapter-1', order: 0 },
      spineRetiredAt: { nodeId: 'chapter-10', order: 2 },
    };
    const result = TimelineEventSchema.safeParse(eventWithSpine);
    expect(result.success).toBe(true);
  });

  it('validates all event types', () => {
    const types = [
      'backstory',
      'flashback',
      'current',
      'flashforward',
      'prophecy',
      'hypothetical',
    ] as const;
    for (const type of types) {
      const event = { ...validEvent, type };
      const result = TimelineEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    }
  });

  it('validates all significance levels', () => {
    const levels = ['critical', 'major', 'moderate', 'minor', 'background'] as const;
    for (const significance of levels) {
      const event = { ...validEvent, significance };
      const result = TimelineEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty name', () => {
    const invalid = { ...validEvent, name: '' };
    const result = TimelineEventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('allows event without duration', () => {
    const { duration, ...eventWithoutDuration } = validEvent;
    const result = TimelineEventSchema.safeParse(eventWithoutDuration);
    expect(result.success).toBe(true);
  });
});

describe('TimelineEventSummarySchema', () => {
  it('validates a valid summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'The Great War',
      position: {
        storyTime: 'Year -100',
        approximate: false,
      },
      type: 'backstory' as const,
      significance: 'critical' as const,
      revealed: true,
    };
    const result = TimelineEventSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('TimelineSpanSchema', () => {
  const validSpan = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    entityType: 'timeline-span' as const,
    name: 'The Dark Ages',
    description: 'A period of technological regression',
    start: {
      storyTime: 'Year -500',
      approximate: true,
    },
    end: {
      storyTime: 'Year -100',
      approximate: true,
    },
    events: ['550e8400-e29b-41d4-a716-446655440001'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete timeline span', () => {
    const result = TimelineSpanSchema.safeParse(validSpan);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const spanWithoutType = {
      id: validSpan.id,
      name: validSpan.name,
      description: validSpan.description,
      start: validSpan.start,
      end: validSpan.end,
      events: validSpan.events,
      createdAt: validSpan.createdAt,
      updatedAt: validSpan.updatedAt,
    };
    const result = TimelineSpanSchema.safeParse(spanWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('timeline-span');
    }
  });

  it('allows span without end (ongoing)', () => {
    const { end, ...spanWithoutEnd } = validSpan;
    const result = TimelineSpanSchema.safeParse(spanWithoutEnd);
    expect(result.success).toBe(true);
  });

  it('allows spine position fields', () => {
    const spanWithSpine = {
      ...validSpan,
      spineIntroducedAt: { nodeId: 'chapter-2', order: 1 },
    };
    const result = TimelineSpanSchema.safeParse(spanWithSpine);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = { ...validSpan, name: '' };
    const result = TimelineSpanSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
