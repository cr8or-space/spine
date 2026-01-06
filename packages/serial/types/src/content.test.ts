import { describe, expect, it } from 'vitest';

import {
  ContentDiffSchema,
  ContentSchema,
  ContentSummarySchema,
  ContentVersionSchema,
  createEmptyContent,
  DiffHunkSchema,
  VersionComparisonSchema,
  VersionMetadataSchema,
  VersionSourceSchema,
  WordDiffSchema,
} from './content';

describe('VersionSourceSchema', () => {
  it('accepts all valid version sources', () => {
    const validSources = ['generated', 'edited', 'imported', 'rollback'];
    for (const source of validSources) {
      const result = VersionSourceSchema.safeParse(source);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid source', () => {
    const result = VersionSourceSchema.safeParse('manual');
    expect(result.success).toBe(false);
  });
});

describe('VersionMetadataSchema', () => {
  it('validates complete metadata', () => {
    const metadata = {
      modelId: 'gpt-4',
      temperature: 0.7,
      promptTemplateId: 'default-prose',
      generationStage: 'draft',
      editDescription: 'Fixed typo',
      importSource: 'scrivener',
      rolledBackFrom: 3,
      autoSaved: true,
      tags: ['revision', 'important'],
    };
    const result = VersionMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });

  it('allows empty metadata', () => {
    const result = VersionMetadataSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects temperature outside range', () => {
    const metadata = {
      temperature: 3.0, // max is 2
    };
    const result = VersionMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });

  it('rejects invalid generation stage', () => {
    const metadata = {
      generationStage: 'final',
    };
    const result = VersionMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(false);
  });
});

describe('ContentVersionSchema', () => {
  it('validates a complete version', () => {
    const version = {
      version: 1,
      text: 'The hero stepped forward into the darkness...',
      wordCount: 8,
      source: 'generated' as const,
      previousVersion: undefined,
      metadata: {
        modelId: 'gpt-4',
        generationStage: 'draft' as const,
      },
      createdAt: '2024-01-01T00:00:00Z',
    };
    const result = ContentVersionSchema.safeParse(version);
    expect(result.success).toBe(true);
  });

  it('requires positive version number', () => {
    const version = {
      version: 0,
      text: 'Text',
      wordCount: 1,
      source: 'edited',
      createdAt: '2024-01-01T00:00:00Z',
    };
    const result = ContentVersionSchema.safeParse(version);
    expect(result.success).toBe(false);
  });
});

describe('ContentSchema', () => {
  const validContent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    structureId: '550e8400-e29b-41d4-a716-446655440001',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        text: 'Content text',
        wordCount: 2,
        source: 'generated' as const,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    text: 'Content text',
    status: 'draft' as const,
    reviews: [],
    generationHistory: [],
    locked: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('validates complete content', () => {
    const result = ContentSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it('validates content with all optional fields', () => {
    const content = {
      ...validContent,
      analysis: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        contentId: validContent.id,
        contentVersion: 1,
        tensionScore: { score: 65, explanation: 'Moderate tension' },
        hookStrength: { score: 80, explanation: 'Strong hook' },
        paceScore: { score: 70, explanation: 'Good pace' },
        characterVoiceScores: {},
        continuityIssues: [],
        wordCount: 2,
        readingTime: 0.1,
        characterAppearances: [],
        locationAppearances: [],
        threadTouches: [],
        analyzedAt: '2024-01-01T00:00:00Z',
      },
      lockReason: 'Foreshadowing planted',
      chapterNumber: 5,
      publishedAt: '2024-02-01T00:00:00Z',
    };
    const result = ContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });

  it('validates all content statuses', () => {
    const statuses = ['draft', 'review', 'approved', 'published'] as const;
    for (const status of statuses) {
      const content = { ...validContent, status };
      const result = ContentSchema.safeParse(content);
      expect(result.success).toBe(true);
    }
  });
});

describe('ContentSummarySchema', () => {
  it('validates a content summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      structureId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Chapter One',
      status: 'approved' as const,
      wordCount: 3500,
      chapterNumber: 1,
      summary: 'The hero begins their journey',
      tensionScore: 72,
      issueCount: 0,
      updatedAt: '2024-01-15T00:00:00Z',
    };
    const result = ContentSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('DiffHunkSchema', () => {
  it('validates an addition hunk', () => {
    const hunk = {
      type: 'add' as const,
      lines: ['New line one', 'New line two'],
      toLine: 10,
      toCount: 2,
    };
    const result = DiffHunkSchema.safeParse(hunk);
    expect(result.success).toBe(true);
  });

  it('validates a removal hunk', () => {
    const hunk = {
      type: 'remove' as const,
      lines: ['Deleted line'],
      fromLine: 5,
      fromCount: 1,
    };
    const result = DiffHunkSchema.safeParse(hunk);
    expect(result.success).toBe(true);
  });

  it('validates a context hunk', () => {
    const hunk = {
      type: 'context' as const,
      lines: ['Unchanged line'],
      fromLine: 3,
      toLine: 3,
      fromCount: 1,
      toCount: 1,
    };
    const result = DiffHunkSchema.safeParse(hunk);
    expect(result.success).toBe(true);
  });
});

describe('WordDiffSchema', () => {
  it('validates word-level changes', () => {
    const diffs = [
      { type: 'unchanged' as const, text: 'The ' },
      { type: 'remove' as const, text: 'old' },
      { type: 'add' as const, text: 'new' },
      { type: 'unchanged' as const, text: ' word.' },
    ];
    for (const diff of diffs) {
      const result = WordDiffSchema.safeParse(diff);
      expect(result.success).toBe(true);
    }
  });
});

describe('ContentDiffSchema', () => {
  it('validates a complete diff', () => {
    const diff = {
      contentId: '550e8400-e29b-41d4-a716-446655440000',
      fromVersion: 1,
      toVersion: 2,
      hunks: [
        {
          type: 'add' as const,
          lines: ['New paragraph.'],
          toLine: 5,
          toCount: 1,
        },
      ],
      stats: {
        additions: 10,
        deletions: 2,
        unchanged: 100,
        changePercent: 10.7,
      },
      timeDelta: {
        fromTimestamp: '2024-01-01T00:00:00Z',
        toTimestamp: '2024-01-02T00:00:00Z',
        durationMs: 86400000,
      },
      sources: {
        from: 'generated' as const,
        to: 'edited' as const,
      },
    };
    const result = ContentDiffSchema.safeParse(diff);
    expect(result.success).toBe(true);
  });
});

describe('VersionComparisonSchema', () => {
  it('validates a version comparison', () => {
    const comparison = {
      diff: {
        contentId: '550e8400-e29b-41d4-a716-446655440000',
        fromVersion: 1,
        toVersion: 2,
        hunks: [],
        stats: {
          additions: 5,
          deletions: 3,
          unchanged: 50,
          changePercent: 13.8,
        },
      },
      wordDiffs: [
        {
          paragraphIndex: 0,
          words: [
            { type: 'unchanged' as const, text: 'The hero ' },
            { type: 'remove' as const, text: 'walked' },
            { type: 'add' as const, text: 'ran' },
          ],
        },
      ],
      summary: {
        description: 'Minor word changes',
        isMajor: false,
        estimatedReviewTime: 30,
      },
    };
    const result = VersionComparisonSchema.safeParse(comparison);
    expect(result.success).toBe(true);
  });
});

describe('createEmptyContent', () => {
  it('creates valid empty content', () => {
    const content = createEmptyContent(
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001'
    );

    expect(content.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(content.structureId).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(content.currentVersion).toBe(1);
    expect(content.versions).toHaveLength(1);
    expect(content.versions[0].version).toBe(1);
    expect(content.versions[0].text).toBe('');
    expect(content.versions[0].source).toBe('generated');
    expect(content.text).toBe('');
    expect(content.status).toBe('draft');
    expect(content.locked).toBe(false);
  });

  it('creates content that validates against schema', () => {
    const content = createEmptyContent(
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001'
    );

    const result = ContentSchema.safeParse(content);
    expect(result.success).toBe(true);
  });
});
