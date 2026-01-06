import { describe, expect, it } from 'vitest';

import {
  AcceptResultSchema,
  ConfidenceLevelSchema,
  EntitySuggestionSchema,
  ExtractableEntityTypeSchema,
  ExtractionEvidenceSchema,
  ExtractionOptionsSchema,
  ExtractionResultSchema,
  FieldUpdateSchema,
  SuggestionStatusSchema,
  SuggestionSummarySchema,
  SuggestionTypeSchema,
} from './extraction';

describe('ExtractableEntityTypeSchema', () => {
  it('accepts all valid entity types', () => {
    const types = ['character', 'location', 'faction', 'world-rule', 'plot-thread'];
    for (const type of types) {
      const result = ExtractableEntityTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = ExtractableEntityTypeSchema.safeParse('item');
    expect(result.success).toBe(false);
  });
});

describe('SuggestionStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses = ['pending', 'accepted', 'rejected', 'merged'];
    for (const status of statuses) {
      const result = SuggestionStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = SuggestionStatusSchema.safeParse('reviewed');
    expect(result.success).toBe(false);
  });
});

describe('SuggestionTypeSchema', () => {
  it('accepts both suggestion types', () => {
    const types = ['new', 'update'];
    for (const type of types) {
      const result = SuggestionTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = SuggestionTypeSchema.safeParse('delete');
    expect(result.success).toBe(false);
  });
});

describe('ConfidenceLevelSchema', () => {
  it('accepts all confidence levels', () => {
    const levels = ['low', 'medium', 'high'];
    for (const level of levels) {
      const result = ConfidenceLevelSchema.safeParse(level);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid level', () => {
    const result = ConfidenceLevelSchema.safeParse('certain');
    expect(result.success).toBe(false);
  });
});

describe('ExtractionEvidenceSchema', () => {
  it('validates complete evidence', () => {
    const evidence = {
      excerpt: 'The tall man with silver hair stepped forward.',
      structureId: '550e8400-e29b-41d4-a716-446655440000',
      position: 45,
    };
    const result = ExtractionEvidenceSchema.safeParse(evidence);
    expect(result.success).toBe(true);
  });

  it('allows evidence without position', () => {
    const evidence = {
      excerpt: 'Some text from the chapter',
      structureId: '550e8400-e29b-41d4-a716-446655440000',
    };
    const result = ExtractionEvidenceSchema.safeParse(evidence);
    expect(result.success).toBe(true);
  });

  it('rejects position above 100', () => {
    const evidence = {
      excerpt: 'Text',
      structureId: '550e8400-e29b-41d4-a716-446655440000',
      position: 150,
    };
    const result = ExtractionEvidenceSchema.safeParse(evidence);
    expect(result.success).toBe(false);
  });

  it('rejects negative position', () => {
    const evidence = {
      excerpt: 'Text',
      structureId: '550e8400-e29b-41d4-a716-446655440000',
      position: -10,
    };
    const result = ExtractionEvidenceSchema.safeParse(evidence);
    expect(result.success).toBe(false);
  });
});

describe('FieldUpdateSchema', () => {
  it('validates a field update', () => {
    const update = {
      field: 'description',
      currentValue: 'A mysterious stranger',
      suggestedValue: 'A mysterious stranger with silver hair and piercing blue eyes',
      reason: 'New physical description details revealed in chapter 5',
    };
    const result = FieldUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('allows update without current value (new field)', () => {
    const update = {
      field: 'nickname',
      suggestedValue: 'The Silver Fox',
      reason: 'Nickname first mentioned in chapter 5',
    };
    const result = FieldUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });
});

describe('EntitySuggestionSchema', () => {
  const validNewSuggestion = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    projectId: '550e8400-e29b-41d4-a716-446655440011',
    suggestionType: 'new' as const,
    entityType: 'character' as const,
    name: 'Marcus Webb',
    suggestedData: {
      name: 'Marcus Webb',
      role: 'supporting',
      description: 'A scientist working on the project',
    },
    evidence: [
      {
        excerpt: 'Dr. Marcus Webb adjusted his glasses...',
        structureId: '550e8400-e29b-41d4-a716-446655440012',
        position: 30,
      },
    ],
    confidence: 'high' as const,
    reasoning: 'Character appears multiple times with consistent description',
    status: 'pending' as const,
    createdAt: '2024-01-15T12:00:00Z',
  };

  it('validates a new entity suggestion', () => {
    const result = EntitySuggestionSchema.safeParse(validNewSuggestion);
    expect(result.success).toBe(true);
  });

  it('validates an update suggestion', () => {
    const updateSuggestion = {
      ...validNewSuggestion,
      suggestionType: 'update' as const,
      existingEntityId: '550e8400-e29b-41d4-a716-446655440013',
      fieldUpdates: [
        {
          field: 'description',
          currentValue: 'A scientist',
          suggestedValue: 'A brilliant but reclusive scientist',
          reason: 'More detail revealed',
        },
      ],
    };
    const result = EntitySuggestionSchema.safeParse(updateSuggestion);
    expect(result.success).toBe(true);
  });

  it('validates all entity types', () => {
    const types = ['character', 'location', 'faction', 'world-rule', 'plot-thread'] as const;
    for (const entityType of types) {
      const suggestion = { ...validNewSuggestion, entityType };
      const result = EntitySuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    }
  });

  it('validates all suggestion statuses', () => {
    const statuses = ['pending', 'accepted', 'rejected', 'merged'] as const;
    for (const status of statuses) {
      const suggestion = { ...validNewSuggestion, status };
      const result = EntitySuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    }
  });

  it('validates all confidence levels', () => {
    const levels = ['low', 'medium', 'high'] as const;
    for (const confidence of levels) {
      const suggestion = { ...validNewSuggestion, confidence };
      const result = EntitySuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    }
  });

  it('allows reviewed suggestion with notes and timestamp', () => {
    const reviewed = {
      ...validNewSuggestion,
      status: 'accepted' as const,
      reviewNotes: 'Added to bible with minor edits',
      reviewedAt: '2024-01-16T10:00:00Z',
    };
    const result = EntitySuggestionSchema.safeParse(reviewed);
    expect(result.success).toBe(true);
  });
});

describe('SuggestionSummarySchema', () => {
  it('validates a summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      suggestionType: 'new' as const,
      entityType: 'character' as const,
      name: 'Marcus Webb',
      confidence: 'high' as const,
      status: 'pending' as const,
      evidenceCount: 3,
      createdAt: '2024-01-15T12:00:00Z',
    };
    const result = SuggestionSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('ExtractionResultSchema', () => {
  it('validates a complete extraction result', () => {
    const result_data = {
      structuresAnalyzed: [
        '550e8400-e29b-41d4-a716-446655440020',
        '550e8400-e29b-41d4-a716-446655440021',
      ],
      suggestionsCreated: 5,
      byType: { new: 3, update: 2 },
      byEntityType: { character: 3, location: 1, faction: 1 },
      errors: [],
    };
    const result = ExtractionResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });

  it('validates result with errors', () => {
    const result_data = {
      structuresAnalyzed: ['550e8400-e29b-41d4-a716-446655440020'],
      suggestionsCreated: 1,
      byType: { new: 1, update: 0 },
      byEntityType: { character: 1 },
      errors: ['Failed to analyze chapter 3: timeout', 'LLM rate limit exceeded for chapter 5'],
    };
    const result = ExtractionResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });

  it('validates empty result', () => {
    const result_data = {
      structuresAnalyzed: [],
      suggestionsCreated: 0,
      byType: { new: 0, update: 0 },
      byEntityType: {},
      errors: [],
    };
    const result = ExtractionResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });
});

describe('ExtractionOptionsSchema', () => {
  it('validates complete options', () => {
    const options = {
      structureIds: ['550e8400-e29b-41d4-a716-446655440030'],
      entityTypes: ['character' as const, 'location' as const],
      aggressiveness: 'aggressive' as const,
      reanalyze: true,
    };
    const result = ExtractionOptionsSchema.safeParse(options);
    expect(result.success).toBe(true);
  });

  it('applies default reanalyze value', () => {
    const options = {};
    const result = ExtractionOptionsSchema.safeParse(options);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reanalyze).toBe(false);
    }
  });

  it('allows empty options (use defaults)', () => {
    const result = ExtractionOptionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates all aggressiveness levels', () => {
    const levels = ['conservative', 'moderate', 'aggressive'] as const;
    for (const aggressiveness of levels) {
      const options = { aggressiveness };
      const result = ExtractionOptionsSchema.safeParse(options);
      expect(result.success).toBe(true);
    }
  });
});

describe('AcceptResultSchema', () => {
  it('validates successful acceptance', () => {
    const result_data = {
      success: true,
      entityId: '550e8400-e29b-41d4-a716-446655440040',
    };
    const result = AcceptResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });

  it('validates failed acceptance', () => {
    const result_data = {
      success: false,
      error: 'Entity with same name already exists',
    };
    const result = AcceptResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });

  it('validates minimal success result', () => {
    const result_data = { success: true };
    const result = AcceptResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });
});
