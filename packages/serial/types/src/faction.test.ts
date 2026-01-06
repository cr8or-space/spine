import { describe, expect, it } from 'vitest';

import {
  FactionMemberSchema,
  FactionRankSchema,
  FactionRelationSchema,
  FactionSchema,
  FactionSummarySchema,
  FactionTypeSchema,
} from './faction';

describe('FactionRankSchema', () => {
  it('validates a valid rank', () => {
    const rank = {
      name: 'Captain',
      level: 3,
      description: 'Commands a squad',
      privileges: ['command-squad', 'access-armory'],
    };
    const result = FactionRankSchema.safeParse(rank);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const rank = {
      name: '',
      level: 1,
      description: 'Description',
      privileges: [],
    };
    const result = FactionRankSchema.safeParse(rank);
    expect(result.success).toBe(false);
  });

  it('rejects negative level', () => {
    const rank = {
      name: 'Private',
      level: -1,
      description: 'Lowest rank',
      privileges: [],
    };
    const result = FactionRankSchema.safeParse(rank);
    expect(result.success).toBe(false);
  });
});

describe('FactionRelationSchema', () => {
  it('validates a valid relation', () => {
    const relation = {
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'allied',
      description: 'Long-standing alliance',
      public: true,
    };
    const result = FactionRelationSchema.safeParse(relation);
    expect(result.success).toBe(true);
  });

  it('validates all relation types', () => {
    const types = ['allied', 'neutral', 'rival', 'hostile', 'subsidiary', 'parent'] as const;
    for (const type of types) {
      const relation = {
        targetId: '550e8400-e29b-41d4-a716-446655440000',
        type,
        description: `${type} relationship`,
        public: false,
      };
      const result = FactionRelationSchema.safeParse(relation);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid relation type', () => {
    const relation = {
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'friendly',
      description: 'Invalid type',
      public: true,
    };
    const result = FactionRelationSchema.safeParse(relation);
    expect(result.success).toBe(false);
  });
});

describe('FactionMemberSchema', () => {
  it('validates a valid member', () => {
    const member = {
      characterId: '550e8400-e29b-41d4-a716-446655440001',
      rank: 'Captain',
      role: 'Squad Leader',
      joinedAt: 'Year 5',
      status: 'active',
    };
    const result = FactionMemberSchema.safeParse(member);
    expect(result.success).toBe(true);
  });

  it('allows minimal member without optional fields', () => {
    const member = {
      characterId: '550e8400-e29b-41d4-a716-446655440001',
      rank: 'Private',
      status: 'former',
    };
    const result = FactionMemberSchema.safeParse(member);
    expect(result.success).toBe(true);
  });

  it('validates all member statuses', () => {
    const statuses = ['active', 'former', 'secret', 'probationary'] as const;
    for (const status of statuses) {
      const member = {
        characterId: '550e8400-e29b-41d4-a716-446655440001',
        rank: 'Member',
        status,
      };
      const result = FactionMemberSchema.safeParse(member);
      expect(result.success).toBe(true);
    }
  });
});

describe('FactionTypeSchema', () => {
  it('accepts all valid faction types', () => {
    const types = [
      'government',
      'military',
      'religious',
      'criminal',
      'corporate',
      'secret-society',
      'guild',
      'family',
      'informal',
      'other',
    ];
    for (const type of types) {
      const result = FactionTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = FactionTypeSchema.safeParse('tribe');
    expect(result.success).toBe(false);
  });
});

describe('FactionSchema', () => {
  const validFaction = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    entityType: 'faction' as const,
    name: 'The Iron Guild',
    aliases: ['Blacksmiths Union', 'The Forgers'],
    description: 'A powerful guild of metalworkers',
    type: 'guild' as const,
    ideology: 'Quality craftsmanship above all',
    goals: ['Control regional iron trade', 'Protect member interests'],
    ranks: [
      {
        name: 'Grandmaster',
        level: 5,
        description: 'Leader of the guild',
        privileges: ['full-authority'],
      },
      {
        name: 'Journeyman',
        level: 2,
        description: 'Full member',
        privileges: ['vote', 'take-commissions'],
      },
    ],
    members: [
      {
        characterId: '550e8400-e29b-41d4-a716-446655440003',
        rank: 'Grandmaster',
        status: 'active' as const,
      },
    ],
    relations: [],
    locations: ['550e8400-e29b-41d4-a716-446655440004'],
    status: 'active' as const,
    influence: 'major' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete faction', () => {
    const result = FactionSchema.safeParse(validFaction);
    expect(result.success).toBe(true);
  });

  it('applies default entityType', () => {
    const factionWithoutType = {
      id: validFaction.id,
      name: validFaction.name,
      aliases: validFaction.aliases,
      description: validFaction.description,
      type: validFaction.type,
      goals: validFaction.goals,
      ranks: validFaction.ranks,
      members: validFaction.members,
      relations: validFaction.relations,
      locations: validFaction.locations,
      status: validFaction.status,
      influence: validFaction.influence,
      createdAt: validFaction.createdAt,
      updatedAt: validFaction.updatedAt,
    };
    const result = FactionSchema.safeParse(factionWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('faction');
    }
  });

  it('allows spine position fields', () => {
    const factionWithSpine = {
      ...validFaction,
      introducedAt: { nodeId: 'chapter-3', order: 0 },
      retiredAt: { nodeId: 'chapter-50', order: 5 },
    };
    const result = FactionSchema.safeParse(factionWithSpine);
    expect(result.success).toBe(true);
  });

  it('validates all faction statuses', () => {
    const statuses = ['active', 'disbanded', 'underground', 'emerging', 'unknown'] as const;
    for (const status of statuses) {
      const faction = { ...validFaction, status };
      const result = FactionSchema.safeParse(faction);
      expect(result.success).toBe(true);
    }
  });

  it('validates all influence levels', () => {
    const levels = ['dominant', 'major', 'moderate', 'minor', 'negligible'] as const;
    for (const influence of levels) {
      const faction = { ...validFaction, influence };
      const result = FactionSchema.safeParse(faction);
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty name', () => {
    const invalid = { ...validFaction, name: '' };
    const result = FactionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('FactionSummarySchema', () => {
  it('validates a valid summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'The Iron Guild',
      type: 'guild' as const,
      influence: 'major' as const,
      brief: 'Powerful metalworkers guild',
    };
    const result = FactionSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});
