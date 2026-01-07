import { describe, expect, it } from 'vitest';

import {
  AppearanceRefSchema,
  CharacterArcSchema,
  CharacterSchema,
  CharacterSummarySchema,
  RelationshipSchema,
  TraitSchema,
} from './character';

describe('TraitSchema', () => {
  it('validates a valid trait', () => {
    const trait = {
      category: 'personality',
      name: 'Brave',
      description: 'Acts without hesitation in dangerous situations',
    };
    const result = TraitSchema.safeParse(trait);
    expect(result.success).toBe(true);
  });

  it('rejects invalid category', () => {
    const trait = {
      category: 'invalid',
      name: 'Brave',
      description: 'Acts without hesitation',
    };
    const result = TraitSchema.safeParse(trait);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const trait = {
      category: 'personality',
      name: '',
      description: 'Description',
    };
    const result = TraitSchema.safeParse(trait);
    expect(result.success).toBe(false);
  });
});

describe('RelationshipSchema', () => {
  it('validates a valid relationship', () => {
    const relationship = {
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'friend',
      description: 'Childhood friends',
      intensity: 75,
      mutual: true,
    };
    const result = RelationshipSchema.safeParse(relationship);
    expect(result.success).toBe(true);
  });

  it('rejects intensity outside range', () => {
    const relationship = {
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'enemy',
      description: 'Bitter rivals',
      intensity: 150, // out of range
      mutual: false,
    };
    const result = RelationshipSchema.safeParse(relationship);
    expect(result.success).toBe(false);
  });

  it('allows negative intensity for hostile relationships', () => {
    const relationship = {
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'enemy',
      description: 'Mortal enemies',
      intensity: -90,
      mutual: true,
    };
    const result = RelationshipSchema.safeParse(relationship);
    expect(result.success).toBe(true);
  });
});

describe('CharacterArcSchema', () => {
  it('validates a valid character arc', () => {
    const arc = {
      type: 'redemption',
      startingPoint: 'A cynical mercenary caring only for money',
      destination: 'A hero willing to sacrifice for others',
      progress: 35,
      milestones: [
        {
          description: 'Saves a child despite no reward',
          chapterId: '550e8400-e29b-41d4-a716-446655440001',
          achieved: true,
        },
        {
          description: 'Refuses payment from grateful villagers',
          achieved: false,
        },
      ],
    };
    const result = CharacterArcSchema.safeParse(arc);
    expect(result.success).toBe(true);
  });

  it('rejects progress outside range', () => {
    const arc = {
      type: 'positive-change',
      startingPoint: 'Start',
      destination: 'End',
      progress: 120,
      milestones: [],
    };
    const result = CharacterArcSchema.safeParse(arc);
    expect(result.success).toBe(false);
  });
});

describe('AppearanceRefSchema', () => {
  it('validates a valid appearance reference', () => {
    const appearance = {
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      chapterNumber: 5,
      type: 'pov',
      context: 'Main POV character for this chapter',
    };
    const result = AppearanceRefSchema.safeParse(appearance);
    expect(result.success).toBe(true);
  });

  it('allows minimal appearance reference', () => {
    const appearance = {
      contentId: '550e8400-e29b-41d4-a716-446655440002',
      type: 'mention',
    };
    const result = AppearanceRefSchema.safeParse(appearance);
    expect(result.success).toBe(true);
  });
});

describe('CharacterSchema', () => {
  const validCharacter = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    entityType: 'character' as const,
    name: 'Elena Blackwood',
    aliases: ['The Shadow Dancer', 'Lady E'],
    description: 'A former thief turned reluctant hero',
    traits: [
      { category: 'personality' as const, name: 'Cunning', description: 'Quick-witted' },
    ],
    relationships: [],
    voiceSamples: ['"I never steal from those who can\'t afford to lose."'],
    appearances: [],
    role: 'protagonist' as const,
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete character', () => {
    const result = CharacterSchema.safeParse(validCharacter);
    expect(result.success).toBe(true);
  });

  it('applies default entityType if not provided', () => {
    const charWithoutType = {
      id: validCharacter.id,
      name: validCharacter.name,
      aliases: validCharacter.aliases,
      description: validCharacter.description,
      traits: validCharacter.traits,
      relationships: validCharacter.relationships,
      voiceSamples: validCharacter.voiceSamples,
      appearances: validCharacter.appearances,
      role: validCharacter.role,
      status: validCharacter.status,
      createdAt: validCharacter.createdAt,
      updatedAt: validCharacter.updatedAt,
    };
    const result = CharacterSchema.safeParse(charWithoutType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entityType).toBe('character');
    }
  });

  it('allows optional spine position fields', () => {
    const charWithSpine = {
      ...validCharacter,
      introducedAt: { nodeId: 'chapter-1', order: 0 },
    };
    const result = CharacterSchema.safeParse(charWithSpine);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.introducedAt).toEqual({ nodeId: 'chapter-1', order: 0 });
    }
  });

  it('validates character with arc', () => {
    const charWithArc = {
      ...validCharacter,
      arc: {
        type: 'coming-of-age' as const,
        startingPoint: 'Naive and trusting',
        destination: 'Wise and discerning',
        progress: 50,
        milestones: [],
      },
    };
    const result = CharacterSchema.safeParse(charWithArc);
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const invalidChar = {
      ...validCharacter,
      role: 'hero', // not a valid role
    };
    const result = CharacterSchema.safeParse(invalidChar);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const invalidChar = {
      ...validCharacter,
      name: '',
    };
    const result = CharacterSchema.safeParse(invalidChar);
    expect(result.success).toBe(false);
  });
});

describe('CharacterSummarySchema', () => {
  it('validates a valid character summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Elena Blackwood',
      aliases: ['The Shadow Dancer'],
      role: 'protagonist' as const,
      status: 'active' as const,
      brief: 'Former thief, now reluctant hero',
    };
    const result = CharacterSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});
