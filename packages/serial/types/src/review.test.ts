import { describe, expect, it } from 'vitest';

import {
  ContentStatusSchema,
  GenerationRecordSchema,
  LockPointSchema,
  ParagraphActionSchema,
  ReviewCommentSchema,
  ReviewQueueItemSchema,
  ReviewSchema,
  RevisionImpactSchema,
} from './review';

describe('ContentStatusSchema', () => {
  it('accepts all valid statuses', () => {
    const statuses = ['draft', 'review', 'approved', 'published'];
    for (const status of statuses) {
      const result = ContentStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const result = ContentStatusSchema.safeParse('pending');
    expect(result.success).toBe(false);
  });
});

describe('ReviewCommentSchema', () => {
  it('validates a complete comment', () => {
    const comment = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      location: {
        paragraphIndex: 5,
        startOffset: 10,
        endOffset: 50,
      },
      text: 'This dialogue feels out of character',
      type: 'issue',
      resolved: false,
      createdAt: '2024-01-15T10:30:00Z',
    };
    const result = ReviewCommentSchema.safeParse(comment);
    expect(result.success).toBe(true);
  });

  it('validates all comment types', () => {
    const types = ['note', 'issue', 'suggestion', 'praise'] as const;
    for (const type of types) {
      const comment = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        location: { paragraphIndex: 0 },
        text: 'Comment text',
        type,
        resolved: false,
        createdAt: '2024-01-15T10:30:00Z',
      };
      const result = ReviewCommentSchema.safeParse(comment);
      expect(result.success).toBe(true);
    }
  });

  it('allows location without offsets', () => {
    const comment = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      location: { paragraphIndex: 3 },
      text: 'General comment on paragraph',
      type: 'note',
      resolved: true,
      createdAt: '2024-01-15T10:30:00Z',
    };
    const result = ReviewCommentSchema.safeParse(comment);
    expect(result.success).toBe(true);
  });

  it('rejects negative paragraph index', () => {
    const comment = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      location: { paragraphIndex: -1 },
      text: 'Comment',
      type: 'note',
      resolved: false,
      createdAt: '2024-01-15T10:30:00Z',
    };
    const result = ReviewCommentSchema.safeParse(comment);
    expect(result.success).toBe(false);
  });
});

describe('ParagraphActionSchema', () => {
  it('validates an accept action', () => {
    const action = {
      paragraphIndex: 5,
      action: 'accept',
      timestamp: '2024-01-15T10:35:00Z',
    };
    const result = ParagraphActionSchema.safeParse(action);
    expect(result.success).toBe(true);
  });

  it('validates an edit action with new text', () => {
    const action = {
      paragraphIndex: 3,
      action: 'edit',
      newText: 'The revised paragraph text...',
      reason: 'Fixed dialogue inconsistency',
      timestamp: '2024-01-15T10:35:00Z',
    };
    const result = ParagraphActionSchema.safeParse(action);
    expect(result.success).toBe(true);
  });

  it('validates all action types', () => {
    const actions = ['accept', 'reject', 'regenerate', 'edit'] as const;
    for (const action of actions) {
      const para = {
        paragraphIndex: 0,
        action,
        timestamp: '2024-01-15T10:35:00Z',
      };
      const result = ParagraphActionSchema.safeParse(para);
      expect(result.success).toBe(true);
    }
  });
});

describe('ReviewSchema', () => {
  const validReview = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    contentId: '550e8400-e29b-41d4-a716-446655440002',
    contentVersion: 1,
    verdict: 'approved',
    comments: [
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        location: { paragraphIndex: 0 },
        text: 'Great opening!',
        type: 'praise' as const,
        resolved: false,
        createdAt: '2024-01-15T10:30:00Z',
      },
    ],
    paragraphActions: [
      {
        paragraphIndex: 5,
        action: 'edit' as const,
        newText: 'Fixed text',
        timestamp: '2024-01-15T10:35:00Z',
      },
    ],
    timeSpent: 1800,
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:30:00Z',
  };

  it('validates a complete review', () => {
    const result = ReviewSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it('validates all verdict values', () => {
    const verdicts = ['pending', 'approved', 'rejected', 'needs-revision'] as const;
    for (const verdict of verdicts) {
      const review = { ...validReview, verdict };
      const result = ReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    }
  });

  it('allows review without verdict (in progress)', () => {
    const { verdict: _verdict, ...reviewWithoutVerdict } = validReview;
    const result = ReviewSchema.safeParse(reviewWithoutVerdict);
    expect(result.success).toBe(true);
  });

  it('allows review without completedAt (in progress)', () => {
    const { completedAt: _completedAt, ...reviewInProgress } = validReview;
    const result = ReviewSchema.safeParse(reviewInProgress);
    expect(result.success).toBe(true);
  });

  it('requires positive content version', () => {
    const invalid = { ...validReview, contentVersion: 0 };
    const result = ReviewSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('LockPointSchema', () => {
  it('validates a lock point', () => {
    const lock = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      contentId: '550e8400-e29b-41d4-a716-446655440011',
      reason: 'Important foreshadowing - do not modify',
      type: 'cascade-protection',
      createdAt: '2024-01-15T12:00:00Z',
    };
    const result = LockPointSchema.safeParse(lock);
    expect(result.success).toBe(true);
  });

  it('validates both lock types', () => {
    const types = ['cascade-protection', 'full-lock'] as const;
    for (const type of types) {
      const lock = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        contentId: '550e8400-e29b-41d4-a716-446655440011',
        reason: 'Lock reason',
        type,
        createdAt: '2024-01-15T12:00:00Z',
      };
      const result = LockPointSchema.safeParse(lock);
      expect(result.success).toBe(true);
    }
  });
});

describe('GenerationRecordSchema', () => {
  const validRecord = {
    id: '550e8400-e29b-41d4-a716-446655440020',
    contentId: '550e8400-e29b-41d4-a716-446655440021',
    version: 1,
    modelId: 'gpt-4',
    temperature: 0.7,
    tokens: {
      prompt: 5000,
      completion: 2000,
    },
    durationMs: 15000,
    stage: 'draft',
    promptTemplateId: 'prose-generation-v1',
    success: true,
    createdAt: '2024-01-15T10:00:00Z',
  };

  it('validates a complete generation record', () => {
    const result = GenerationRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it('validates all generation stages', () => {
    const stages = ['outline', 'beats', 'draft', 'revision', 'self-review'] as const;
    for (const stage of stages) {
      const record = { ...validRecord, stage };
      const result = GenerationRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    }
  });

  it('validates failed generation with error', () => {
    const failed = {
      ...validRecord,
      success: false,
      error: 'Rate limit exceeded',
    };
    const result = GenerationRecordSchema.safeParse(failed);
    expect(result.success).toBe(true);
  });

  it('rejects temperature above 2', () => {
    const invalid = { ...validRecord, temperature: 2.5 };
    const result = GenerationRecordSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative temperature', () => {
    const invalid = { ...validRecord, temperature: -0.5 };
    const result = GenerationRecordSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('RevisionImpactSchema', () => {
  it('validates revision impact analysis', () => {
    const impact = {
      sourceContentId: '550e8400-e29b-41d4-a716-446655440030',
      affectedContents: [
        {
          contentId: '550e8400-e29b-41d4-a716-446655440031',
          reason: 'References modified character description',
          severity: 'direct' as const,
        },
        {
          contentId: '550e8400-e29b-41d4-a716-446655440032',
          reason: 'May have continuity issues',
          severity: 'indirect' as const,
        },
      ],
      protectedByLocks: ['550e8400-e29b-41d4-a716-446655440033'],
      horizonChapters: 20,
      analyzedAt: '2024-01-15T12:00:00Z',
    };
    const result = RevisionImpactSchema.safeParse(impact);
    expect(result.success).toBe(true);
  });

  it('requires positive horizon chapters', () => {
    const invalid = {
      sourceContentId: '550e8400-e29b-41d4-a716-446655440030',
      affectedContents: [],
      protectedByLocks: [],
      horizonChapters: 0,
      analyzedAt: '2024-01-15T12:00:00Z',
    };
    const result = RevisionImpactSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('ReviewQueueItemSchema', () => {
  it('validates a queue item', () => {
    const item = {
      contentId: '550e8400-e29b-41d4-a716-446655440040',
      structureId: '550e8400-e29b-41d4-a716-446655440041',
      title: 'Chapter 5: The Revelation',
      status: 'draft' as const,
      priority: 10,
      queuedAt: '2024-01-15T08:00:00Z',
      issueCount: 2,
      wordCount: 3500,
    };
    const result = ReviewQueueItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('validates all content statuses', () => {
    const statuses = ['draft', 'review', 'approved', 'published'] as const;
    for (const status of statuses) {
      const item = {
        contentId: '550e8400-e29b-41d4-a716-446655440040',
        structureId: '550e8400-e29b-41d4-a716-446655440041',
        title: 'Chapter',
        status,
        priority: 1,
        queuedAt: '2024-01-15T08:00:00Z',
        issueCount: 0,
        wordCount: 1000,
      };
      const result = ReviewQueueItemSchema.safeParse(item);
      expect(result.success).toBe(true);
    }
  });
});
