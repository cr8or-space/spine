import { describe, expect, it } from 'vitest';

import {
  BeatSchema,
  ChapterTypeSchema,
  createEmptyStructure,
  HookSchema,
  HookTypeSchema,
  StructureRefSchema,
  StructureSchema,
  StructureTypeSchema,
} from './structure';

describe('BeatSchema', () => {
  it('validates a valid beat', () => {
    const beat = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'The hero discovers the secret passage',
      completed: false,
      targetWordCount: 500,
      order: 0,
    };
    const result = BeatSchema.safeParse(beat);
    expect(result.success).toBe(true);
  });

  it('allows minimal beat without optional fields', () => {
    const beat = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Beat description',
      completed: true,
      order: 1,
    };
    const result = BeatSchema.safeParse(beat);
    expect(result.success).toBe(true);
  });

  it('rejects negative order', () => {
    const beat = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Beat',
      completed: false,
      order: -1,
    };
    const result = BeatSchema.safeParse(beat);
    expect(result.success).toBe(false);
  });
});

describe('HookTypeSchema', () => {
  it('accepts all valid hook types', () => {
    const validTypes = [
      'revelation',
      'decision',
      'cliffhanger',
      'emotional',
      'question',
      'twist',
      'promise',
    ];
    for (const type of validTypes) {
      const result = HookTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid hook type', () => {
    const result = HookTypeSchema.safeParse('suspense');
    expect(result.success).toBe(false);
  });
});

describe('HookSchema', () => {
  it('validates a valid hook', () => {
    const hook = {
      type: 'cliffhanger',
      description: 'The villain appears behind the hero',
      targetStrength: 85,
    };
    const result = HookSchema.safeParse(hook);
    expect(result.success).toBe(true);
  });

  it('allows hook without targetStrength', () => {
    const hook = {
      type: 'revelation',
      description: 'The hero learns of their true parentage',
    };
    const result = HookSchema.safeParse(hook);
    expect(result.success).toBe(true);
  });

  it('rejects strength outside range', () => {
    const hook = {
      type: 'emotional',
      description: 'Description',
      targetStrength: 150,
    };
    const result = HookSchema.safeParse(hook);
    expect(result.success).toBe(false);
  });
});

describe('ChapterTypeSchema', () => {
  it('accepts all valid chapter types', () => {
    const validTypes = [
      'action',
      'character',
      'worldbuilding',
      'dialogue',
      'introspection',
      'transition',
      'climax',
      'resolution',
    ];
    for (const type of validTypes) {
      const result = ChapterTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });
});

describe('StructureTypeSchema', () => {
  it('accepts all valid structure types', () => {
    const validTypes = ['book', 'arc', 'chapter', 'scene'];
    for (const type of validTypes) {
      const result = StructureTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });
});

describe('StructureSchema', () => {
  const validStructure = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    type: 'chapter' as const,
    title: 'The Dark Beginning',
    summary: 'The hero embarks on their journey',
    beats: [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        description: 'Hero receives the call',
        completed: false,
        order: 0,
      },
    ],
    tensionTarget: 60,
    chapterType: 'action' as const,
    hook: {
      type: 'cliffhanger' as const,
      description: 'Enemy appears',
      targetStrength: 75,
    },
    order: 1,
    children: [],
    targetWordCount: 3000,
    notes: 'Focus on atmosphere',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates a complete structure', () => {
    const result = StructureSchema.safeParse(validStructure);
    expect(result.success).toBe(true);
  });

  it('validates structure with nested children', () => {
    const bookWithArcs = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      type: 'book' as const,
      title: 'Book One',
      summary: 'The first book in the series',
      beats: [],
      order: 0,
      children: [
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          type: 'arc' as const,
          title: 'Arc One',
          summary: 'First arc',
          beats: [],
          order: 0,
          children: [],
          parentId: '550e8400-e29b-41d4-a716-446655440003',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    const result = StructureSchema.safeParse(bookWithArcs);
    expect(result.success).toBe(true);
  });

  it('rejects tension target outside range', () => {
    const invalid = {
      ...validStructure,
      tensionTarget: 120,
    };
    const result = StructureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const invalid = {
      ...validStructure,
      title: '',
    };
    const result = StructureSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('StructureRefSchema', () => {
  it('validates a valid structure reference', () => {
    const ref = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      type: 'chapter' as const,
      title: 'Chapter One',
      order: 0,
    };
    const result = StructureRefSchema.safeParse(ref);
    expect(result.success).toBe(true);
  });

  it('allows optional parentId', () => {
    const ref = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      type: 'scene' as const,
      title: 'Opening Scene',
      parentId: '550e8400-e29b-41d4-a716-446655440002',
      order: 0,
    };
    const result = StructureRefSchema.safeParse(ref);
    expect(result.success).toBe(true);
  });
});

describe('createEmptyStructure', () => {
  it('creates a valid empty structure', () => {
    const structure = createEmptyStructure(
      '550e8400-e29b-41d4-a716-446655440001',
      'chapter',
      'New Chapter'
    );

    expect(structure.id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(structure.type).toBe('chapter');
    expect(structure.title).toBe('New Chapter');
    expect(structure.summary).toBe('');
    expect(structure.beats).toEqual([]);
    expect(structure.order).toBe(0);
    expect(structure.children).toEqual([]);
    expect(structure.parentId).toBeUndefined();
    expect(structure.createdAt).toBeDefined();
    expect(structure.updatedAt).toBeDefined();
  });

  it('creates structure with parentId', () => {
    const structure = createEmptyStructure(
      '550e8400-e29b-41d4-a716-446655440001',
      'scene',
      'New Scene',
      '550e8400-e29b-41d4-a716-446655440002'
    );

    expect(structure.parentId).toBe('550e8400-e29b-41d4-a716-446655440002');
  });

  it('creates structure that validates against schema', () => {
    const structure = createEmptyStructure(
      '550e8400-e29b-41d4-a716-446655440001',
      'arc',
      'New Arc'
    );

    const result = StructureSchema.safeParse(structure);
    expect(result.success).toBe(true);
  });
});
