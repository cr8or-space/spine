import { describe, expect, it } from 'vitest';

import {
  BufferDepletionSchema,
  BufferStatusSchema,
  ChapterReleaseDataPointSchema,
  DeadlineStatusSchema,
  DeadlineUrgencySchema,
  ReleasePlanningConfigSchema,
  ReleasePlanningResultSchema,
  ReleaseProjectionSchema,
  ReleaseScheduleConfigSchema,
  ScheduledReleaseSchema,
} from './release';

describe('ReleaseScheduleConfigSchema', () => {
  it('validates a complete config', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 3,
      skipWeekends: true,
      skipDates: ['2024-12-25T00:00:00Z', '2024-01-01T00:00:00Z'],
    };
    const result = ReleaseScheduleConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 2,
    };
    const result = ReleaseScheduleConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skipWeekends).toBe(false);
      expect(result.data.skipDates).toEqual([]);
    }
  });

  it('requires positive release interval', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 0,
    };
    const result = ReleaseScheduleConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('ScheduledReleaseSchema', () => {
  it('validates a scheduled release with chapter', () => {
    const release = {
      date: '2024-02-01T00:00:00Z',
      structureId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Chapter 5: The Revelation',
      hasChapter: true,
      isPublished: false,
      releaseNumber: 5,
    };
    const result = ScheduledReleaseSchema.safeParse(release);
    expect(result.success).toBe(true);
  });

  it('validates a scheduled release without chapter', () => {
    const release = {
      date: '2024-02-15T00:00:00Z',
      hasChapter: false,
      isPublished: false,
      releaseNumber: 10,
    };
    const result = ScheduledReleaseSchema.safeParse(release);
    expect(result.success).toBe(true);
  });

  it('requires positive release number', () => {
    const release = {
      date: '2024-02-01T00:00:00Z',
      hasChapter: false,
      isPublished: false,
      releaseNumber: 0,
    };
    const result = ScheduledReleaseSchema.safeParse(release);
    expect(result.success).toBe(false);
  });
});

describe('BufferStatusSchema', () => {
  it('validates a healthy buffer', () => {
    const status = {
      approvedCount: 8,
      scheduledCount: 2,
      publishedCount: 10,
      bufferSize: 6,
      minimumBuffer: 5,
      isHealthy: true,
      deficit: 0,
      warnings: [],
    };
    const result = BufferStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it('validates an unhealthy buffer', () => {
    const status = {
      approvedCount: 3,
      scheduledCount: 1,
      publishedCount: 10,
      bufferSize: 2,
      minimumBuffer: 5,
      isHealthy: false,
      deficit: 3,
      warnings: ['Buffer below minimum', 'Consider slowing release pace'],
    };
    const result = BufferStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });
});

describe('ReleaseProjectionSchema', () => {
  it('validates a projection with chapter', () => {
    const projection = {
      date: '2024-02-10T00:00:00Z',
      structureId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Chapter 12',
      bufferAfter: 4,
      depletesBuffer: false,
      daysFromNow: 10,
    };
    const result = ReleaseProjectionSchema.safeParse(projection);
    expect(result.success).toBe(true);
  });

  it('validates a projection that depletes buffer', () => {
    const projection = {
      date: '2024-03-01T00:00:00Z',
      bufferAfter: 0,
      depletesBuffer: true,
      daysFromNow: 30,
    };
    const result = ReleaseProjectionSchema.safeParse(projection);
    expect(result.success).toBe(true);
  });
});

describe('BufferDepletionSchema', () => {
  it('validates depletion projection with date', () => {
    const depletion = {
      currentBuffer: 5,
      depletionDate: '2024-03-15T00:00:00Z',
      daysUntilDepletion: 45,
      releasesUntilDepletion: 15,
      willDeplete: true,
      projectedReleases: [],
    };
    const result = BufferDepletionSchema.safeParse(depletion);
    expect(result.success).toBe(true);
  });

  it('validates healthy projection (no depletion)', () => {
    const depletion = {
      currentBuffer: 10,
      willDeplete: false,
      projectedReleases: [],
    };
    const result = BufferDepletionSchema.safeParse(depletion);
    expect(result.success).toBe(true);
  });
});

describe('DeadlineUrgencySchema', () => {
  it('accepts all urgency levels', () => {
    const levels = ['safe', 'warning', 'critical'];
    for (const level of levels) {
      const result = DeadlineUrgencySchema.safeParse(level);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid urgency', () => {
    const result = DeadlineUrgencySchema.safeParse('urgent');
    expect(result.success).toBe(false);
  });
});

describe('DeadlineStatusSchema', () => {
  it('validates deadline with next release', () => {
    const status = {
      nextDeadline: '2024-02-05T00:00:00Z',
      daysUntilDeadline: 5,
      urgency: 'safe' as const,
      requiredChaptersPerWeek: 3.5,
      nextReleaseReady: true,
      statusDescription: 'On track with healthy buffer',
    };
    const result = DeadlineStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it('validates warning urgency status', () => {
    const status = {
      nextDeadline: '2024-02-02T00:00:00Z',
      daysUntilDeadline: 2,
      urgency: 'warning' as const,
      requiredChaptersPerWeek: 5,
      nextReleaseReady: false,
      statusDescription: 'Buffer running low, increase production',
    };
    const result = DeadlineStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it('validates status without deadline (no releases scheduled)', () => {
    const status = {
      urgency: 'safe' as const,
      requiredChaptersPerWeek: 0,
      nextReleaseReady: false,
      statusDescription: 'No releases scheduled',
    };
    const result = DeadlineStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });
});

describe('ChapterReleaseDataPointSchema', () => {
  it('validates a published chapter', () => {
    const point = {
      structureId: '550e8400-e29b-41d4-a716-446655440010',
      title: 'Chapter 1',
      chapterNumber: 1,
      status: 'published' as const,
      scheduledDate: '2024-01-15T00:00:00Z',
      publishedDate: '2024-01-15T00:00:00Z',
      isReleasable: false,
    };
    const result = ChapterReleaseDataPointSchema.safeParse(point);
    expect(result.success).toBe(true);
  });

  it('validates all chapter statuses', () => {
    const statuses = ['draft', 'review', 'approved', 'published'] as const;
    for (const status of statuses) {
      const point = {
        structureId: '550e8400-e29b-41d4-a716-446655440010',
        title: 'Chapter',
        chapterNumber: 1,
        status,
        isReleasable: status === 'approved' || status === 'published',
      };
      const result = ChapterReleaseDataPointSchema.safeParse(point);
      expect(result.success).toBe(true);
    }
  });

  it('requires positive chapter number', () => {
    const point = {
      structureId: '550e8400-e29b-41d4-a716-446655440010',
      title: 'Chapter',
      chapterNumber: 0,
      status: 'draft' as const,
      isReleasable: false,
    };
    const result = ChapterReleaseDataPointSchema.safeParse(point);
    expect(result.success).toBe(false);
  });
});

describe('ReleasePlanningResultSchema', () => {
  it('validates a complete planning result', () => {
    const result_data = {
      chapters: [],
      bufferStatus: {
        approvedCount: 5,
        scheduledCount: 1,
        publishedCount: 10,
        bufferSize: 4,
        minimumBuffer: 5,
        isHealthy: false,
        deficit: 1,
        warnings: ['Buffer below minimum'],
      },
      depletion: {
        currentBuffer: 4,
        willDeplete: true,
        depletionDate: '2024-03-01T00:00:00Z',
        daysUntilDepletion: 30,
        releasesUntilDepletion: 10,
        projectedReleases: [],
      },
      deadlineStatus: {
        nextDeadline: '2024-02-05T00:00:00Z',
        daysUntilDeadline: 5,
        urgency: 'warning' as const,
        requiredChaptersPerWeek: 4,
        nextReleaseReady: true,
        statusDescription: 'Warning: Buffer running low',
      },
      upcomingReleases: [],
      stats: {
        totalChapters: 20,
        byStatus: { draft: 5, review: 3, approved: 2, published: 10 },
        averageReleaseDays: 3,
        releasesPerWeek: 2.3,
        bufferDays: 12,
      },
      warnings: ['Consider increasing production rate'],
      analyzedAt: '2024-01-30T12:00:00Z',
    };
    const result = ReleasePlanningResultSchema.safeParse(result_data);
    expect(result.success).toBe(true);
  });
});

describe('ReleasePlanningConfigSchema', () => {
  it('validates complete config', () => {
    const config = {
      projectionDays: 60,
      warningThresholdDays: 5,
      criticalThresholdDays: 2,
      referenceDate: '2024-02-01T00:00:00Z',
    };
    const result = ReleasePlanningConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const result = ReleasePlanningConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectionDays).toBe(90);
      expect(result.data.warningThresholdDays).toBe(7);
      expect(result.data.criticalThresholdDays).toBe(3);
    }
  });

  it('requires positive projection days', () => {
    const config = { projectionDays: 0 };
    const result = ReleasePlanningConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
