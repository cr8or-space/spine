import { describe, expect, it } from 'vitest';

import {
  LocationFeatureSchema,
  LocationRelationSchema,
  LocationSchema,
  LocationSummarySchema,
  LocationTypeSchema,
} from './location';

describe('LocationTypeSchema', () => {
  it('accepts all valid location types', () => {
    const validTypes = [
      'world',
      'continent',
      'country',
      'region',
      'city',
      'district',
      'building',
      'room',
      'natural',
      'virtual',
      'other',
    ];
    for (const type of validTypes) {
      const result = LocationTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = LocationTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('LocationRelationSchema', () => {
  it('validates a valid relation', () => {
    const relation = {
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'contains',
      description: 'The castle is within the kingdom',
      distance: '3 days ride',
    };
    const result = LocationRelationSchema.safeParse(relation);
    expect(result.success).toBe(true);
  });

  it('allows minimal relation', () => {
    const relation = {
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'adjacent',
    };
    const result = LocationRelationSchema.safeParse(relation);
    expect(result.success).toBe(true);
  });
});

describe('LocationFeatureSchema', () => {
  it('validates a valid feature', () => {
    const feature = {
      name: 'Ancient Oak',
      description: 'A massive oak tree that has stood for a thousand years',
      significance: 'landmark',
    };
    const result = LocationFeatureSchema.safeParse(feature);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const feature = {
      name: '',
      description: 'Description',
      significance: 'functional',
    };
    const result = LocationFeatureSchema.safeParse(feature);
    expect(result.success).toBe(false);
  });
});

describe('LocationSchema', () => {
  const validLocation = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    entityType: 'location' as const,
    name: 'Castle Ironhold',
    aliases: ['The Iron Fortress', 'Blackstone Keep'],
    description: 'An imposing fortress built into the mountainside',
    type: 'building' as const,
    relations: [],
    features: [
      {
        name: 'Great Hall',
        description: 'A vast hall with vaulted ceilings',
        significance: 'functional' as const,
      },
    ],
    atmosphere: 'Cold and foreboding, with torchlight casting long shadows',
    associatedCharacters: ['550e8400-e29b-41d4-a716-446655440002'],
    status: 'accessible' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete location', () => {
    const result = LocationSchema.safeParse(validLocation);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const locWithoutType = {
      id: validLocation.id,
      name: validLocation.name,
      aliases: validLocation.aliases,
      description: validLocation.description,
      type: validLocation.type,
      relations: validLocation.relations,
      features: validLocation.features,
      atmosphere: validLocation.atmosphere,
      associatedCharacters: validLocation.associatedCharacters,
      status: validLocation.status,
      createdAt: validLocation.createdAt,
      updatedAt: validLocation.updatedAt,
    };
    const result = LocationSchema.safeParse(locWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('location');
    }
  });

  it('allows hierarchical locations with parentId', () => {
    const childLocation = {
      ...validLocation,
      parentId: '550e8400-e29b-41d4-a716-446655440003',
      type: 'room' as const,
    };
    const result = LocationSchema.safeParse(childLocation);
    expect(result.success).toBe(true);
  });

  it('allows spine position fields', () => {
    const locWithSpine = {
      ...validLocation,
      introducedAt: { nodeId: 'chapter-1', order: 0 },
      retiredAt: { nodeId: 'chapter-20', order: 5 },
    };
    const result = LocationSchema.safeParse(locWithSpine);
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const invalidLoc = {
      ...validLocation,
      status: 'open',
    };
    const result = LocationSchema.safeParse(invalidLoc);
    expect(result.success).toBe(false);
  });
});

describe('LocationSummarySchema', () => {
  it('validates a valid summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Castle Ironhold',
      type: 'building' as const,
      brief: 'Imposing mountain fortress',
    };
    const result = LocationSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('allows optional parentId', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Great Hall',
      type: 'room' as const,
      parentId: '550e8400-e29b-41d4-a716-446655440002',
      brief: 'Main meeting hall',
    };
    const result = LocationSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});
