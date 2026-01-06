import { describe, expect, it } from 'vitest';

import {
  ClueDistributionSuggestionSchema,
  ClueTypeSchema,
  LayerAnalysisResultSchema,
  MysteryClueSchema,
  MysteryLayerSchema,
  MysteryResolutionSchema,
  MysteryStatusSchema,
  MysteryTrackingDataSchema,
  MysteryWarningSchema,
  ResolutionTypeSchema,
  SuspenseCurveSchema,
} from './mystery';

describe('MysteryLayerSchema', () => {
  it('accepts all valid layers', () => {
    const layers = ['surface', 'intermediate', 'deep', 'meta'];
    for (const layer of layers) {
      const result = MysteryLayerSchema.safeParse(layer);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid layer', () => {
    const result = MysteryLayerSchema.safeParse('hidden');
    expect(result.success).toBe(false);
  });
});

describe('MysteryStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses = ['planted', 'developing', 'climaxing', 'resolving', 'resolved', 'abandoned'];
    for (const status of statuses) {
      const result = MysteryStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = MysteryStatusSchema.safeParse('ongoing');
    expect(result.success).toBe(false);
  });
});

describe('ClueTypeSchema', () => {
  it('accepts all valid clue types', () => {
    const types = ['direct', 'indirect', 'red-herring', 'misdirection'];
    for (const type of types) {
      const result = ClueTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = ClueTypeSchema.safeParse('hint');
    expect(result.success).toBe(false);
  });
});

describe('ResolutionTypeSchema', () => {
  it('accepts all valid resolution types', () => {
    const types = ['reveal', 'deduction', 'twist', 'subversion'];
    for (const type of types) {
      const result = ResolutionTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    const result = ResolutionTypeSchema.safeParse('explanation');
    expect(result.success).toBe(false);
  });
});

describe('MysteryClueSchema', () => {
  it('validates a complete clue', () => {
    const clue = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'The detective notices a muddy footprint',
      type: 'direct',
      revealedAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440001',
        chapterNumber: 3,
        position: 3,
      },
      importance: 75,
      fulfilled: false,
    };
    const result = MysteryClueSchema.safeParse(clue);
    expect(result.success).toBe(true);
  });

  it('applies default fulfilled value', () => {
    const clue = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'A subtle hint',
      type: 'indirect',
      revealedAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440001',
        position: 5,
      },
      importance: 30,
    };
    const result = MysteryClueSchema.safeParse(clue);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fulfilled).toBe(false);
    }
  });

  it('rejects importance above 100', () => {
    const clue = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Clue',
      type: 'direct',
      revealedAt: { contentId: '550e8400-e29b-41d4-a716-446655440001', position: 1 },
      importance: 150,
    };
    const result = MysteryClueSchema.safeParse(clue);
    expect(result.success).toBe(false);
  });

  it('rejects negative importance', () => {
    const clue = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Clue',
      type: 'direct',
      revealedAt: { contentId: '550e8400-e29b-41d4-a716-446655440001', position: 1 },
      importance: -10,
    };
    const result = MysteryClueSchema.safeParse(clue);
    expect(result.success).toBe(false);
  });
});

describe('MysteryResolutionSchema', () => {
  it('validates a complete resolution', () => {
    const resolution = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      resolvedAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440011',
        chapterNumber: 20,
        position: 20,
      },
      type: 'reveal',
      satisfying: true,
      cluesResolved: [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ],
    };
    const result = MysteryResolutionSchema.safeParse(resolution);
    expect(result.success).toBe(true);
  });

  it('validates unsatisfying resolution', () => {
    const resolution = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      resolvedAt: {
        contentId: '550e8400-e29b-41d4-a716-446655440011',
        position: 15,
      },
      type: 'twist',
      satisfying: false,
      cluesResolved: [],
    };
    const result = MysteryResolutionSchema.safeParse(resolution);
    expect(result.success).toBe(true);
  });
});

describe('MysteryTrackingDataSchema', () => {
  const validTracking = {
    threadId: '550e8400-e29b-41d4-a716-446655440020',
    mysteryName: 'Who killed the butler?',
    layer: 'surface' as const,
    status: 'developing' as const,
    planted: {
      position: 1,
      contentId: '550e8400-e29b-41d4-a716-446655440021',
      chapterNumber: 1,
    },
    clues: [],
    resolutions: [],
    summary: {
      totalClues: 5,
      directClues: 2,
      indirectClues: 2,
      redHerringCount: 1,
      clueDensity: 0.25,
      averageChaptersPerClue: 4,
      unfulfilledClues: 3,
      unfulfilled: ['The missing key', 'The torn letter'],
      suspenseRating: 75,
      satisfactionRating: 80,
    },
  };

  it('validates complete tracking data', () => {
    const result = MysteryTrackingDataSchema.safeParse(validTracking);
    expect(result.success).toBe(true);
  });

  it('validates tracking with climax and resolution', () => {
    const tracking = {
      ...validTracking,
      status: 'resolved' as const,
      climax: {
        position: 18,
        contentId: '550e8400-e29b-41d4-a716-446655440022',
      },
      resolution: {
        position: 20,
        contentId: '550e8400-e29b-41d4-a716-446655440023',
        chapterNumber: 20,
      },
    };
    const result = MysteryTrackingDataSchema.safeParse(tracking);
    expect(result.success).toBe(true);
  });

  it('validates all mystery layers', () => {
    const layers = ['surface', 'intermediate', 'deep', 'meta'] as const;
    for (const layer of layers) {
      const tracking = { ...validTracking, layer };
      const result = MysteryTrackingDataSchema.safeParse(tracking);
      expect(result.success).toBe(true);
    }
  });

  it('validates all mystery statuses', () => {
    const statuses = [
      'planted',
      'developing',
      'climaxing',
      'resolving',
      'resolved',
      'abandoned',
    ] as const;
    for (const status of statuses) {
      const tracking = { ...validTracking, status };
      const result = MysteryTrackingDataSchema.safeParse(tracking);
      expect(result.success).toBe(true);
    }
  });
});

describe('MysteryWarningSchema', () => {
  it('validates a warning', () => {
    const warning = {
      mysteryId: '550e8400-e29b-41d4-a716-446655440030',
      type: 'unfulfilled-clues',
      severity: 'medium',
      message: '3 clues remain unfulfilled',
      unfulfilledCount: 3,
      position: 20,
    };
    const result = MysteryWarningSchema.safeParse(warning);
    expect(result.success).toBe(true);
  });

  it('validates all warning types', () => {
    const types = [
      'unfulfilled-clues',
      'missing-climax',
      'premature-resolution',
      'abandoned',
      'low-satisfaction',
    ] as const;
    for (const type of types) {
      const warning = {
        mysteryId: '550e8400-e29b-41d4-a716-446655440030',
        type,
        severity: 'high' as const,
        message: 'Warning message',
      };
      const result = MysteryWarningSchema.safeParse(warning);
      expect(result.success).toBe(true);
    }
  });

  it('validates all severity levels', () => {
    const severities = ['low', 'medium', 'high'] as const;
    for (const severity of severities) {
      const warning = {
        mysteryId: '550e8400-e29b-41d4-a716-446655440030',
        type: 'abandoned' as const,
        severity,
        message: 'Warning',
      };
      const result = MysteryWarningSchema.safeParse(warning);
      expect(result.success).toBe(true);
    }
  });
});

describe('LayerAnalysisResultSchema', () => {
  it('validates layer analysis', () => {
    const analysis = {
      surfaceCount: 3,
      intermediateCount: 2,
      deepCount: 1,
      metaCount: 0,
      recommendation: 'Consider adding a deep mystery for experienced readers',
    };
    const result = LayerAnalysisResultSchema.safeParse(analysis);
    expect(result.success).toBe(true);
  });

  it('allows analysis without recommendation', () => {
    const analysis = {
      surfaceCount: 2,
      intermediateCount: 2,
      deepCount: 1,
      metaCount: 1,
    };
    const result = LayerAnalysisResultSchema.safeParse(analysis);
    expect(result.success).toBe(true);
  });
});

describe('SuspenseCurveSchema', () => {
  it('validates a suspense curve', () => {
    const curve = {
      chapters: [
        { position: 1, suspenseLevel: 30, activeMysteries: 1, cluesRevealed: 0 },
        { position: 2, suspenseLevel: 45, activeMysteries: 1, cluesRevealed: 1 },
        { position: 3, suspenseLevel: 60, activeMysteries: 2, cluesRevealed: 1 },
        { position: 4, suspenseLevel: 80, activeMysteries: 2, cluesRevealed: 2 },
        { position: 5, suspenseLevel: 40, activeMysteries: 1, cluesRevealed: 0 },
      ],
    };
    const result = SuspenseCurveSchema.safeParse(curve);
    expect(result.success).toBe(true);
  });

  it('validates empty chapters array', () => {
    const curve = { chapters: [] };
    const result = SuspenseCurveSchema.safeParse(curve);
    expect(result.success).toBe(true);
  });

  it('rejects suspense level above 100', () => {
    const curve = {
      chapters: [{ position: 1, suspenseLevel: 150, activeMysteries: 1, cluesRevealed: 0 }],
    };
    const result = SuspenseCurveSchema.safeParse(curve);
    expect(result.success).toBe(false);
  });
});

describe('ClueDistributionSuggestionSchema', () => {
  it('validates a distribution suggestion', () => {
    const suggestion = {
      mysteryId: '550e8400-e29b-41d4-a716-446655440040',
      estimatedChapters: 20,
      recommendedClues: 8,
      distribution: [
        { position: 3, clueType: 'indirect' as const, rationale: 'Early hint' },
        { position: 8, clueType: 'direct' as const, rationale: 'Major revelation' },
        { position: 12, clueType: 'red-herring' as const, rationale: 'Misdirect readers' },
        { position: 17, clueType: 'direct' as const, rationale: 'Final clue before resolution' },
      ],
    };
    const result = ClueDistributionSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(true);
  });

  it('requires positive estimated chapters', () => {
    const suggestion = {
      mysteryId: '550e8400-e29b-41d4-a716-446655440040',
      estimatedChapters: 0,
      recommendedClues: 5,
      distribution: [],
    };
    const result = ClueDistributionSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(false);
  });
});
