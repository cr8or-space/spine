import { describe, expect, it } from 'vitest';

import {
  AggregatedAnalysisSchema,
  CharacterPresenceHeatmapSchema,
  CharacterTrackingDataSchema,
  ContentAnalysisSchema,
  ContinuityIssueSchema,
  CycleDataPointSchema,
  CycleEnforcementResultSchema,
  ExplainedScoreSchema,
  HookDataPointSchema,
  HookManagementResultSchema,
  HookPatternAnalysisSchema,
  PlotThreadTrackingDataSchema,
  PresenceTypeSchema,
  TensionCurveDataPointSchema,
  TensionCurveDataSchema,
  ThreadActivityHeatmapSchema,
} from './analysis';

describe('ContinuityIssueSchema', () => {
  it('validates a complete continuity issue', () => {
    const issue = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'character-inconsistency',
      severity: 'major',
      description: 'Character eye color changed from blue to green',
      location: {
        paragraphIndex: 5,
        startOffset: 100,
        endOffset: 150,
      },
      conflictsWith: {
        type: 'character',
        id: '550e8400-e29b-41d4-a716-446655440001',
        detail: 'Eye color was established as blue in chapter 1',
      },
      suggestion: 'Change eye color back to blue',
      reviewed: false,
      falsePositive: false,
    };
    const result = ContinuityIssueSchema.safeParse(issue);
    expect(result.success).toBe(true);
  });

  it('validates all issue types', () => {
    const types = [
      'character-inconsistency',
      'location-error',
      'timeline-conflict',
      'fact-contradiction',
      'world-rule-violation',
      'character-voice',
      'relationship-error',
      'other',
    ] as const;
    for (const type of types) {
      const issue = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type,
        severity: 'minor' as const,
        description: 'Issue description',
        location: { paragraphIndex: 0 },
        conflictsWith: { type: 'character' as const, id: '550e8400-e29b-41d4-a716-446655440001' },
        reviewed: false,
        falsePositive: false,
      };
      const result = ContinuityIssueSchema.safeParse(issue);
      expect(result.success).toBe(true);
    }
  });

  it('validates all severity levels', () => {
    const severities = ['critical', 'major', 'minor', 'nitpick'] as const;
    for (const severity of severities) {
      const issue = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'other' as const,
        severity,
        description: 'Issue',
        location: {},
        conflictsWith: { type: 'content' as const, id: '550e8400-e29b-41d4-a716-446655440001' },
        reviewed: false,
        falsePositive: false,
      };
      const result = ContinuityIssueSchema.safeParse(issue);
      expect(result.success).toBe(true);
    }
  });
});

describe('ExplainedScoreSchema', () => {
  it('validates a complete explained score', () => {
    const score = {
      score: 75,
      explanation: 'Good tension with room for improvement',
      factors: [
        { name: 'Pacing', impact: 10, detail: 'Well-paced action' },
        { name: 'Stakes', impact: -5, detail: 'Stakes could be clearer' },
      ],
    };
    const result = ExplainedScoreSchema.safeParse(score);
    expect(result.success).toBe(true);
  });

  it('validates score without factors', () => {
    const score = {
      score: 50,
      explanation: 'Average score',
    };
    const result = ExplainedScoreSchema.safeParse(score);
    expect(result.success).toBe(true);
  });

  it('rejects score below 0', () => {
    const score = { score: -10, explanation: 'Invalid' };
    const result = ExplainedScoreSchema.safeParse(score);
    expect(result.success).toBe(false);
  });

  it('rejects score above 100', () => {
    const score = { score: 150, explanation: 'Invalid' };
    const result = ExplainedScoreSchema.safeParse(score);
    expect(result.success).toBe(false);
  });
});

describe('ContentAnalysisSchema', () => {
  const validAnalysis = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    contentId: '550e8400-e29b-41d4-a716-446655440011',
    contentVersion: 1,
    tensionScore: { score: 65, explanation: 'Moderate tension' },
    hookStrength: { score: 80, explanation: 'Strong hook' },
    paceScore: { score: 70, explanation: 'Good pacing' },
    characterVoiceScores: {
      '550e8400-e29b-41d4-a716-446655440012': {
        score: 85,
        explanation: 'Consistent voice',
      },
    },
    continuityIssues: [],
    wordCount: 3500,
    readingTime: 14,
    characterAppearances: [
      {
        characterId: '550e8400-e29b-41d4-a716-446655440012',
        type: 'pov' as const,
        dialogueLines: 15,
      },
    ],
    locationAppearances: ['550e8400-e29b-41d4-a716-446655440013'],
    threadTouches: [
      {
        threadId: '550e8400-e29b-41d4-a716-446655440014',
        type: 'development' as const,
      },
    ],
    analyzedAt: '2024-01-15T10:30:00Z',
    modelId: 'gpt-4',
  };

  it('validates a complete content analysis', () => {
    const result = ContentAnalysisSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
  });

  it('requires positive content version', () => {
    const invalid = { ...validAnalysis, contentVersion: 0 };
    const result = ContentAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates character appearance types', () => {
    const appearances = ['mention', 'scene', 'pov'] as const;
    for (const type of appearances) {
      const analysis = {
        ...validAnalysis,
        characterAppearances: [
          { characterId: '550e8400-e29b-41d4-a716-446655440012', type },
        ],
      };
      const result = ContentAnalysisSchema.safeParse(analysis);
      expect(result.success).toBe(true);
    }
  });
});

describe('AggregatedAnalysisSchema', () => {
  it('validates a complete aggregated analysis', () => {
    const analysis = {
      structureId: '550e8400-e29b-41d4-a716-446655440020',
      averageTension: 68,
      tensionDivergence: -5,
      totalWordCount: 35000,
      totalReadingTime: 140,
      issuesBySeverity: { critical: 0, major: 2, minor: 5, nitpick: 3 },
      characterPresence: {
        '550e8400-e29b-41d4-a716-446655440021': { appearances: 10, povChapters: 3 },
      },
      threadStatus: {
        '550e8400-e29b-41d4-a716-446655440022': { touches: 5, lastTouchType: 'development' as const },
      },
      calculatedAt: '2024-01-15T12:00:00Z',
    };
    const result = AggregatedAnalysisSchema.safeParse(analysis);
    expect(result.success).toBe(true);
  });

  it('rejects average tension above 100', () => {
    const invalid = {
      structureId: '550e8400-e29b-41d4-a716-446655440020',
      averageTension: 150,
      tensionDivergence: 0,
      totalWordCount: 0,
      totalReadingTime: 0,
      issuesBySeverity: { critical: 0, major: 0, minor: 0, nitpick: 0 },
      characterPresence: {},
      threadStatus: {},
      calculatedAt: '2024-01-15T12:00:00Z',
    };
    const result = AggregatedAnalysisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('HookPatternAnalysisSchema', () => {
  it('validates hook pattern analysis', () => {
    const analysis = {
      recentHooks: [
        {
          contentId: '550e8400-e29b-41d4-a716-446655440030',
          hookType: 'cliffhanger' as const,
          strength: 85,
        },
        {
          contentId: '550e8400-e29b-41d4-a716-446655440031',
          hookType: 'revelation' as const,
          strength: 70,
        },
      ],
      distribution: { cliffhanger: 3, revelation: 2, emotional: 1 },
      varietyScore: 75,
      warnings: ['Consider varying hook types more'],
    };
    const result = HookPatternAnalysisSchema.safeParse(analysis);
    expect(result.success).toBe(true);
  });
});

describe('TensionCurveDataPointSchema', () => {
  it('validates a complete data point', () => {
    const dataPoint = {
      structureId: '550e8400-e29b-41d4-a716-446655440040',
      position: 5,
      title: 'Chapter 5',
      structureType: 'chapter',
      plannedTension: 70,
      actualTension: 65,
      divergence: -5,
      wordCount: 3000,
      contentStatus: 'approved',
      hasContent: true,
      hasAnalysis: true,
      contentId: '550e8400-e29b-41d4-a716-446655440041',
    };
    const result = TensionCurveDataPointSchema.safeParse(dataPoint);
    expect(result.success).toBe(true);
  });

  it('validates data point without content', () => {
    const dataPoint = {
      structureId: '550e8400-e29b-41d4-a716-446655440040',
      position: 6,
      title: 'Chapter 6',
      structureType: 'chapter',
      plannedTension: 75,
      hasContent: false,
      hasAnalysis: false,
    };
    const result = TensionCurveDataPointSchema.safeParse(dataPoint);
    expect(result.success).toBe(true);
  });
});

describe('TensionCurveDataSchema', () => {
  it('validates complete tension curve data', () => {
    const data = {
      dataPoints: [
        {
          structureId: '550e8400-e29b-41d4-a716-446655440040',
          position: 1,
          title: 'Chapter 1',
          structureType: 'chapter' as const,
          hasContent: true,
          hasAnalysis: true,
        },
      ],
      metadata: {
        rootStructureId: '550e8400-e29b-41d4-a716-446655440050',
        rootTitle: 'Book One',
        generatedAt: '2024-01-15T12:00:00Z',
        dataPointCount: 1,
        plannedCount: 1,
        actualCount: 1,
        averagePlannedTension: 60,
        averageActualTension: 58,
      },
    };
    const result = TensionCurveDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('PresenceTypeSchema', () => {
  it('accepts all valid presence types', () => {
    const types = ['mention', 'scene', 'pov'];
    for (const type of types) {
      const result = PresenceTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });
});

describe('CharacterTrackingDataSchema', () => {
  it('validates complete character tracking data', () => {
    const data = {
      characterId: '550e8400-e29b-41d4-a716-446655440060',
      characterName: 'Hero',
      role: 'protagonist' as const,
      appearances: [],
      relationshipEvolution: [],
      summary: {
        totalAppearances: 15,
        povChapters: 5,
        sceneAppearances: 8,
        mentionAppearances: 2,
        totalDialogueLines: 120,
        firstAppearance: 1,
        lastAppearance: 20,
        appearanceDensity: 0.75,
      },
    };
    const result = CharacterTrackingDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('validates all character roles', () => {
    const roles = ['protagonist', 'antagonist', 'major', 'supporting', 'minor'] as const;
    for (const role of roles) {
      const data = {
        characterId: '550e8400-e29b-41d4-a716-446655440060',
        characterName: 'Character',
        role,
        appearances: [],
        relationshipEvolution: [],
        summary: {
          totalAppearances: 0,
          povChapters: 0,
          sceneAppearances: 0,
          mentionAppearances: 0,
          totalDialogueLines: 0,
          appearanceDensity: 0,
        },
      };
      const result = CharacterTrackingDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });
});

describe('CharacterPresenceHeatmapSchema', () => {
  it('validates a heatmap', () => {
    const heatmap = {
      characterIds: ['char1', 'char2'],
      characterNames: ['Hero', 'Sidekick'],
      positions: [1, 2, 3],
      titles: ['Ch 1', 'Ch 2', 'Ch 3'],
      matrix: [
        [3, 2, 1],
        [1, 2, 3],
      ],
      generatedAt: '2024-01-15T12:00:00Z',
    };
    const result = CharacterPresenceHeatmapSchema.safeParse(heatmap);
    expect(result.success).toBe(true);
  });

  it('rejects matrix values above 3', () => {
    const heatmap = {
      characterIds: ['char1'],
      characterNames: ['Hero'],
      positions: [1],
      titles: ['Ch 1'],
      matrix: [[4]],
      generatedAt: '2024-01-15T12:00:00Z',
    };
    const result = CharacterPresenceHeatmapSchema.safeParse(heatmap);
    expect(result.success).toBe(false);
  });
});

describe('PlotThreadTrackingDataSchema', () => {
  it('validates complete thread tracking data', () => {
    const data = {
      threadId: '550e8400-e29b-41d4-a716-446655440070',
      threadName: 'Main Plot',
      threadType: 'main-plot' as const,
      scope: 'series' as const,
      status: 'active' as const,
      priority: 100,
      statusPoints: [],
      promises: [],
      involvedCharacterIds: [],
      summary: {
        totalTouches: 10,
        firstTouchPosition: 1,
        lastTouchPosition: 20,
        activeDuration: 19,
        dormantPeriods: [],
        totalDormantChapters: 0,
        totalPromises: 2,
        fulfilledPromises: 1,
        promiseFulfillmentRate: 0.5,
        unfulfilledCount: 1,
        isCompleted: false,
        isDangling: false,
        touchDensity: 0.5,
      },
    };
    const result = PlotThreadTrackingDataSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('ThreadActivityHeatmapSchema', () => {
  it('validates a thread heatmap', () => {
    const heatmap = {
      threadIds: ['thread1', 'thread2'],
      threadNames: ['Main Plot', 'Subplot'],
      positions: [1, 2, 3],
      titles: ['Ch 1', 'Ch 2', 'Ch 3'],
      matrix: [
        [1, 2, 0],
        [0, 3, 5],
      ],
      generatedAt: '2024-01-15T12:00:00Z',
    };
    const result = ThreadActivityHeatmapSchema.safeParse(heatmap);
    expect(result.success).toBe(true);
  });

  it('rejects matrix values above 5', () => {
    const heatmap = {
      threadIds: ['thread1'],
      threadNames: ['Plot'],
      positions: [1],
      titles: ['Ch 1'],
      matrix: [[6]],
      generatedAt: '2024-01-15T12:00:00Z',
    };
    const result = ThreadActivityHeatmapSchema.safeParse(heatmap);
    expect(result.success).toBe(false);
  });
});

describe('HookDataPointSchema', () => {
  it('validates hook data point', () => {
    const point = {
      contentId: '550e8400-e29b-41d4-a716-446655440080',
      title: 'Chapter 5',
      position: 5,
      hookType: 'cliffhanger',
      strength: 85,
    };
    const result = HookDataPointSchema.safeParse(point);
    expect(result.success).toBe(true);
  });

  it('validates none hook type', () => {
    const point = {
      contentId: '550e8400-e29b-41d4-a716-446655440080',
      position: 5,
      hookType: 'none',
      strength: 0,
    };
    const result = HookDataPointSchema.safeParse(point);
    expect(result.success).toBe(true);
  });
});

describe('HookManagementResultSchema', () => {
  it('validates hook management result', () => {
    const result_data = {
      distribution: { cliffhanger: 5, revelation: 3, emotional: 2 },
      dataPoints: [],
      varietyScore: 75,
      repetitionDetails: [],
      strengthTrend: {
        trend: 'improving' as const,
        average: 70,
        recentAverage: 78,
        slope: 1.5,
      },
      warnings: [],
    };
    const result = HookManagementResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });
});

describe('CycleDataPointSchema', () => {
  it('validates cycle data point', () => {
    const point = {
      structureId: '550e8400-e29b-41d4-a716-446655440090',
      title: 'Chapter 3',
      globalPosition: 3,
      cyclePosition: 2,
      cycleNumber: 1,
      targetTension: 70,
      plannedTension: 65,
      actualTension: 68,
      deviationFromTarget: -2,
    };
    const result = CycleDataPointSchema.safeParse(point);
    expect(result.success).toBe(true);
  });
});

describe('CycleEnforcementResultSchema', () => {
  it('validates cycle enforcement result', () => {
    const result_data = {
      dataPoints: [],
      phaseInfo: {
        currentCycle: 2,
        currentPosition: 3,
        cycleLength: 5,
        tensionTargets: [40, 60, 70, 80, 50],
        totalChapters: 8,
        chaptersInCurrentCycle: 3,
        isCycleComplete: false,
        phaseDescription: 'rising',
        nextTargetTension: 80,
      },
      violations: [],
      suggestions: [],
      stats: {
        totalCycles: 2,
        completeCycles: 1,
        averageDeviation: 5,
        violationCount: 0,
        complianceRate: 100,
      },
      warnings: [],
    };
    const result = CycleEnforcementResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });
});
