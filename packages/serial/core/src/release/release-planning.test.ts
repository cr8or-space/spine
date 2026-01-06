import { describe, expect, it } from 'vitest';

import type { Content, SerialSettings, Structure } from '@repo/serial-types';

import {
  analyzeReleasePlanning,
  calculateBufferDepletion,
  calculateBufferStatus,
  calculateChaptersNeeded,
  extractChapterReleaseDataPoints,
  extractChaptersInOrder,
  generateScheduledReleases,
  getNextReleaseDate,
  getReleasePlanningSummary,
  suggestReleaseInterval,
  validateReleaseScheduleConfig,
} from './release-planning';

// Helper to create test structures
function createTestStructure(
  id: string,
  type: Structure['type'],
  title: string,
  children: Structure[] = []
): Structure {
  const now = new Date().toISOString();
  return {
    id,
    type,
    title,
    summary: '',
    beats: [],
    order: 0,
    children,
    createdAt: now,
    updatedAt: now,
  };
}

function createTestContent(
  id: string,
  structureId: string,
  status: Content['status'],
  publishedAt?: string
): Content {
  const now = new Date().toISOString();
  return {
    id,
    structureId,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        text: 'Test content',
        wordCount: 100,
        source: 'generated',
        createdAt: now,
      },
    ],
    text: 'Test content',
    status,
    reviews: [],
    generationHistory: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
    publishedAt,
  };
}

function createTestSerialSettings(overrides?: Partial<SerialSettings>): SerialSettings {
  return {
    cycleLength: 5,
    cycleTensionTargets: [40, 60, 70, 80, 50],
    minimumBuffer: 5,
    releaseInterval: 2,
    enforceHookVariety: true,
    maxConsecutiveSameHook: 2,
    ...overrides,
  };
}

describe('extractChaptersInOrder', () => {
  it('should extract chapters from a flat structure', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
      createTestStructure('ch-2', 'chapter', 'Chapter 2'),
      createTestStructure('ch-3', 'chapter', 'Chapter 3'),
    ]);

    // Set order
    book.children[0].order = 0;
    book.children[1].order = 1;
    book.children[2].order = 2;

    const chapters = extractChaptersInOrder(book);

    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('Chapter 1');
    expect(chapters[1].title).toBe('Chapter 2');
    expect(chapters[2].title).toBe('Chapter 3');
  });

  it('should extract chapters from nested arcs', () => {
    const arc1 = createTestStructure('arc-1', 'arc', 'Arc 1', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
      createTestStructure('ch-2', 'chapter', 'Chapter 2'),
    ]);
    arc1.children[0].order = 0;
    arc1.children[1].order = 1;

    const arc2 = createTestStructure('arc-2', 'arc', 'Arc 2', [
      createTestStructure('ch-3', 'chapter', 'Chapter 3'),
    ]);
    arc2.children[0].order = 0;

    const book = createTestStructure('book-1', 'book', 'Test Book', [arc1, arc2]);
    book.children[0].order = 0;
    book.children[1].order = 1;

    const chapters = extractChaptersInOrder(book);

    expect(chapters).toHaveLength(3);
    expect(chapters[0].title).toBe('Chapter 1');
    expect(chapters[1].title).toBe('Chapter 2');
    expect(chapters[2].title).toBe('Chapter 3');
  });

  it('should respect order within each level', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-3', 'chapter', 'Chapter 3'),
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
      createTestStructure('ch-2', 'chapter', 'Chapter 2'),
    ]);

    book.children[0].order = 2; // ch-3
    book.children[1].order = 0; // ch-1
    book.children[2].order = 1; // ch-2

    const chapters = extractChaptersInOrder(book);

    expect(chapters[0].title).toBe('Chapter 1');
    expect(chapters[1].title).toBe('Chapter 2');
    expect(chapters[2].title).toBe('Chapter 3');
  });

  it('should return empty array for structure with no chapters', () => {
    const book = createTestStructure('book-1', 'book', 'Empty Book');
    const chapters = extractChaptersInOrder(book);
    expect(chapters).toHaveLength(0);
  });
});

describe('extractChapterReleaseDataPoints', () => {
  it('should extract data points with content status', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
      createTestStructure('ch-2', 'chapter', 'Chapter 2'),
      createTestStructure('ch-3', 'chapter', 'Chapter 3'),
    ]);
    book.children[0].order = 0;
    book.children[1].order = 1;
    book.children[2].order = 2;

    const contentMap = new Map<string, Content>();
    contentMap.set('ch-1', createTestContent('c-1', 'ch-1', 'published', '2024-01-01T00:00:00.000Z'));
    contentMap.set('ch-2', createTestContent('c-2', 'ch-2', 'approved'));
    contentMap.set('ch-3', createTestContent('c-3', 'ch-3', 'draft'));

    const dataPoints = extractChapterReleaseDataPoints(book, contentMap);

    expect(dataPoints).toHaveLength(3);

    expect(dataPoints[0].structureId).toBe('ch-1');
    expect(dataPoints[0].chapterNumber).toBe(1);
    expect(dataPoints[0].status).toBe('published');
    expect(dataPoints[0].isReleasable).toBe(false);

    expect(dataPoints[1].structureId).toBe('ch-2');
    expect(dataPoints[1].chapterNumber).toBe(2);
    expect(dataPoints[1].status).toBe('approved');
    expect(dataPoints[1].isReleasable).toBe(true);

    expect(dataPoints[2].structureId).toBe('ch-3');
    expect(dataPoints[2].chapterNumber).toBe(3);
    expect(dataPoints[2].status).toBe('draft');
    expect(dataPoints[2].isReleasable).toBe(false);
  });

  it('should default to draft status for missing content', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
    ]);
    book.children[0].order = 0;

    const dataPoints = extractChapterReleaseDataPoints(book, new Map());

    expect(dataPoints[0].status).toBe('draft');
    expect(dataPoints[0].isReleasable).toBe(false);
  });
});

describe('calculateBufferStatus', () => {
  it('should calculate healthy buffer', () => {
    const dataPoints = [
      { structureId: 'ch-1', title: 'Ch 1', chapterNumber: 1, status: 'published' as const, isReleasable: false },
      { structureId: 'ch-2', title: 'Ch 2', chapterNumber: 2, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-3', title: 'Ch 3', chapterNumber: 3, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-4', title: 'Ch 4', chapterNumber: 4, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-5', title: 'Ch 5', chapterNumber: 5, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-6', title: 'Ch 6', chapterNumber: 6, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-7', title: 'Ch 7', chapterNumber: 7, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-8', title: 'Ch 8', chapterNumber: 8, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-9', title: 'Ch 9', chapterNumber: 9, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-10', title: 'Ch 10', chapterNumber: 10, status: 'draft' as const, isReleasable: false },
    ];

    const settings = createTestSerialSettings({ minimumBuffer: 5 });
    const status = calculateBufferStatus(dataPoints, settings);

    expect(status.approvedCount).toBe(8);
    expect(status.publishedCount).toBe(1);
    expect(status.bufferSize).toBe(8);
    expect(status.minimumBuffer).toBe(5);
    expect(status.isHealthy).toBe(true);
    expect(status.deficit).toBe(0);
    // Buffer is well above minimum (8 vs 5), no warnings expected
    expect(status.warnings).toHaveLength(0);
  });

  it('should detect unhealthy buffer', () => {
    const dataPoints = [
      { structureId: 'ch-1', title: 'Ch 1', chapterNumber: 1, status: 'published' as const, isReleasable: false },
      { structureId: 'ch-2', title: 'Ch 2', chapterNumber: 2, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-3', title: 'Ch 3', chapterNumber: 3, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-4', title: 'Ch 4', chapterNumber: 4, status: 'draft' as const, isReleasable: false },
    ];

    const settings = createTestSerialSettings({ minimumBuffer: 5 });
    const status = calculateBufferStatus(dataPoints, settings);

    expect(status.bufferSize).toBe(2);
    expect(status.isHealthy).toBe(false);
    expect(status.deficit).toBe(3);
    expect(status.warnings.length).toBeGreaterThan(0);
    expect(status.warnings[0]).toContain('below minimum');
  });

  it('should warn about empty buffer', () => {
    const dataPoints = [
      { structureId: 'ch-1', title: 'Ch 1', chapterNumber: 1, status: 'published' as const, isReleasable: false },
      { structureId: 'ch-2', title: 'Ch 2', chapterNumber: 2, status: 'draft' as const, isReleasable: false },
    ];

    const settings = createTestSerialSettings({ minimumBuffer: 5 });
    const status = calculateBufferStatus(dataPoints, settings);

    expect(status.bufferSize).toBe(0);
    expect(status.isHealthy).toBe(false);
    expect(status.warnings[0]).toContain('Buffer is empty');
  });

  it('should warn about many chapters in review', () => {
    const dataPoints = [
      { structureId: 'ch-1', title: 'Ch 1', chapterNumber: 1, status: 'approved' as const, isReleasable: true },
      { structureId: 'ch-2', title: 'Ch 2', chapterNumber: 2, status: 'review' as const, isReleasable: false },
      { structureId: 'ch-3', title: 'Ch 3', chapterNumber: 3, status: 'review' as const, isReleasable: false },
      { structureId: 'ch-4', title: 'Ch 4', chapterNumber: 4, status: 'review' as const, isReleasable: false },
      { structureId: 'ch-5', title: 'Ch 5', chapterNumber: 5, status: 'review' as const, isReleasable: false },
    ];

    const settings = createTestSerialSettings({ minimumBuffer: 1 });
    const status = calculateBufferStatus(dataPoints, settings);

    expect(status.warnings.some((w) => w.includes('waiting in review'))).toBe(true);
  });
});

describe('getNextReleaseDate', () => {
  it('should add interval days', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const next = getNextReleaseDate(start, 2);

    expect(next.toISOString().split('T')[0]).toBe('2024-01-03');
  });

  it('should skip weekends when configured', () => {
    // 2024-01-05 is Friday, adding 2 days would land on Sunday
    const start = new Date('2024-01-05T00:00:00Z');
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 2,
      skipWeekends: true,
      skipDates: [],
    };
    const next = getNextReleaseDate(start, 2, config);

    // Should skip to Monday (2024-01-08)
    expect(next.getDay()).not.toBe(0); // Not Sunday
    expect(next.getDay()).not.toBe(6); // Not Saturday
  });

  it('should skip specified dates', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 2,
      skipWeekends: false,
      skipDates: ['2024-01-03T00:00:00Z'],
    };
    const next = getNextReleaseDate(start, 2, config);

    expect(next.toISOString().split('T')[0]).toBe('2024-01-04');
  });
});

describe('generateScheduledReleases', () => {
  it('should generate correct number of releases', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 3,
      skipWeekends: false,
      skipDates: [],
    };
    const referenceDate = new Date('2024-01-01T00:00:00Z');

    const releases = generateScheduledReleases(config, 5, referenceDate);

    expect(releases).toHaveLength(5);
    expect(releases[0].releaseNumber).toBe(1);
    expect(releases[4].releaseNumber).toBe(5);
  });

  it('should mark past releases as published', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 3,
      skipWeekends: false,
      skipDates: [],
    };
    const referenceDate = new Date('2024-01-10T00:00:00Z');

    const releases = generateScheduledReleases(config, 5, referenceDate);

    // First few releases should be marked as published
    expect(releases[0].isPublished).toBe(true); // Jan 1
    expect(releases[1].isPublished).toBe(true); // Jan 4
    expect(releases[2].isPublished).toBe(true); // Jan 7
    expect(releases[3].isPublished).toBe(false); // Jan 10 (same as ref)
  });
});

describe('calculateBufferDepletion', () => {
  it('should project buffer depletion', () => {
    const bufferStatus = {
      approvedCount: 3,
      scheduledCount: 0,
      publishedCount: 5,
      bufferSize: 3,
      minimumBuffer: 5,
      isHealthy: false,
      deficit: 2,
      warnings: [],
    };

    const settings = createTestSerialSettings({ releaseInterval: 2 });
    const config = {
      projectionDays: 30,
      warningThresholdDays: 7,
      criticalThresholdDays: 3,
      referenceDate: '2024-01-01T00:00:00Z',
    };

    const depletion = calculateBufferDepletion(bufferStatus, settings, config);

    expect(depletion.currentBuffer).toBe(3);
    expect(depletion.willDeplete).toBe(true);
    expect(depletion.releasesUntilDepletion).toBe(3);
    expect(depletion.daysUntilDepletion).toBe(6); // 3 releases * 2 days
  });

  it('should not project depletion for healthy buffer over long period', () => {
    const bufferStatus = {
      approvedCount: 100,
      scheduledCount: 0,
      publishedCount: 0,
      bufferSize: 100,
      minimumBuffer: 5,
      isHealthy: true,
      deficit: 0,
      warnings: [],
    };

    const settings = createTestSerialSettings({ releaseInterval: 7 }); // Weekly
    const config = {
      projectionDays: 30, // Only 30 days
      warningThresholdDays: 7,
      criticalThresholdDays: 3,
      referenceDate: '2024-01-01T00:00:00Z',
    };

    const depletion = calculateBufferDepletion(bufferStatus, settings, config);

    // 30 days / 7 day interval = ~4 releases, buffer of 100 won't deplete
    expect(depletion.willDeplete).toBe(false);
    expect(depletion.depletionDate).toBeUndefined();
  });

  it('should handle zero buffer', () => {
    const bufferStatus = {
      approvedCount: 0,
      scheduledCount: 0,
      publishedCount: 5,
      bufferSize: 0,
      minimumBuffer: 5,
      isHealthy: false,
      deficit: 5,
      warnings: [],
    };

    const settings = createTestSerialSettings({ releaseInterval: 2 });
    const config = {
      projectionDays: 30,
      warningThresholdDays: 7,
      criticalThresholdDays: 3,
      referenceDate: '2024-01-01T00:00:00Z',
    };

    const depletion = calculateBufferDepletion(bufferStatus, settings, config);

    expect(depletion.currentBuffer).toBe(0);
    // Even with 0 buffer, the first release will show depletion
    expect(depletion.projectedReleases[0].bufferAfter).toBe(0);
  });
});

describe('analyzeReleasePlanning', () => {
  it('should produce comprehensive analysis', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
      createTestStructure('ch-2', 'chapter', 'Chapter 2'),
      createTestStructure('ch-3', 'chapter', 'Chapter 3'),
      createTestStructure('ch-4', 'chapter', 'Chapter 4'),
      createTestStructure('ch-5', 'chapter', 'Chapter 5'),
    ]);
    book.children.forEach((ch, i) => (ch.order = i));

    const contentMap = new Map<string, Content>();
    contentMap.set('ch-1', createTestContent('c-1', 'ch-1', 'published'));
    contentMap.set('ch-2', createTestContent('c-2', 'ch-2', 'approved'));
    contentMap.set('ch-3', createTestContent('c-3', 'ch-3', 'approved'));
    contentMap.set('ch-4', createTestContent('c-4', 'ch-4', 'review'));
    contentMap.set('ch-5', createTestContent('c-5', 'ch-5', 'draft'));

    const settings = createTestSerialSettings({ minimumBuffer: 3, releaseInterval: 2 });
    const config = { referenceDate: '2024-01-01T00:00:00Z' };

    const result = analyzeReleasePlanning(book, settings, contentMap, undefined, config);

    expect(result.chapters).toHaveLength(5);
    expect(result.stats.totalChapters).toBe(5);
    expect(result.stats.byStatus.published).toBe(1);
    expect(result.stats.byStatus.approved).toBe(2);
    expect(result.stats.byStatus.review).toBe(1);
    expect(result.stats.byStatus.draft).toBe(1);

    expect(result.bufferStatus.bufferSize).toBe(2);
    expect(result.bufferStatus.isHealthy).toBe(false);
    expect(result.bufferStatus.deficit).toBe(1);

    expect(result.deadlineStatus.urgency).toBeDefined();
    expect(result.deadlineStatus.nextReleaseReady).toBe(true);

    expect(result.upcomingReleases.length).toBeGreaterThan(0);
    expect(result.analyzedAt).toBe('2024-01-01T00:00:00Z');
  });

  it('should handle empty project', () => {
    const book = createTestStructure('book-1', 'book', 'Empty Book');
    const settings = createTestSerialSettings();

    const result = analyzeReleasePlanning(book, settings);

    expect(result.chapters).toHaveLength(0);
    expect(result.bufferStatus.bufferSize).toBe(0);
    expect(result.stats.totalChapters).toBe(0);
  });

  it('should set correct urgency for critical situations', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
    ]);
    book.children[0].order = 0;

    const contentMap = new Map<string, Content>();
    contentMap.set('ch-1', createTestContent('c-1', 'ch-1', 'draft'));

    const settings = createTestSerialSettings({ minimumBuffer: 5 });
    const config = { referenceDate: '2024-01-01T00:00:00Z' };

    const result = analyzeReleasePlanning(book, settings, contentMap, undefined, config);

    expect(result.bufferStatus.bufferSize).toBe(0);
    expect(result.deadlineStatus.urgency).toBe('critical');
    expect(result.deadlineStatus.nextReleaseReady).toBe(false);
  });
});

describe('getReleasePlanningSummary', () => {
  it('should produce readable summary', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
      createTestStructure('ch-2', 'chapter', 'Chapter 2'),
    ]);
    book.children.forEach((ch, i) => (ch.order = i));

    const contentMap = new Map<string, Content>();
    contentMap.set('ch-1', createTestContent('c-1', 'ch-1', 'published'));
    contentMap.set('ch-2', createTestContent('c-2', 'ch-2', 'approved'));

    const settings = createTestSerialSettings({ minimumBuffer: 3, releaseInterval: 2 });
    const result = analyzeReleasePlanning(book, settings, contentMap);

    const summary = getReleasePlanningSummary(result, settings);

    expect(summary).toContain('Release Planning Summary');
    expect(summary).toContain('Release interval: every 2 day(s)');
    expect(summary).toContain('Minimum buffer: 3 chapter(s)');
    expect(summary).toContain('Buffer Status');
    expect(summary).toContain('Deadline Status');
  });

  it('should include depletion warning when applicable', () => {
    const book = createTestStructure('book-1', 'book', 'Test Book', [
      createTestStructure('ch-1', 'chapter', 'Chapter 1'),
    ]);
    book.children[0].order = 0;

    const contentMap = new Map<string, Content>();
    contentMap.set('ch-1', createTestContent('c-1', 'ch-1', 'approved'));

    const settings = createTestSerialSettings({ minimumBuffer: 1, releaseInterval: 2 });
    const result = analyzeReleasePlanning(book, settings, contentMap);

    const summary = getReleasePlanningSummary(result, settings);

    expect(summary).toContain('Depletion Warning');
  });
});

describe('validateReleaseScheduleConfig', () => {
  it('should accept valid configuration', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 2,
      skipWeekends: false,
      skipDates: [],
    };

    const errors = validateReleaseScheduleConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('should reject invalid interval', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 0,
      skipWeekends: false,
      skipDates: [],
    };

    const errors = validateReleaseScheduleConfig(config);
    expect(errors.some((e) => e.includes('at least 1 day'))).toBe(true);
  });

  it('should reject too long interval', () => {
    const config = {
      startDate: '2024-01-01T00:00:00Z',
      releaseIntervalDays: 400,
      skipWeekends: false,
      skipDates: [],
    };

    const errors = validateReleaseScheduleConfig(config);
    expect(errors.some((e) => e.includes('exceed 365'))).toBe(true);
  });

  it('should reject invalid dates', () => {
    const config = {
      startDate: 'not-a-date',
      releaseIntervalDays: 2,
      skipWeekends: false,
      skipDates: ['also-not-a-date'],
    };

    const errors = validateReleaseScheduleConfig(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('calculateChaptersNeeded', () => {
  it('should return 0 when buffer is sufficient', () => {
    const needed = calculateChaptersNeeded(10, 5, 3);
    // Buffer after: 10 - 3 = 7, which is >= 5
    expect(needed).toBe(0);
  });

  it('should calculate deficit when buffer depletes', () => {
    const needed = calculateChaptersNeeded(5, 5, 3);
    // Buffer after: 5 - 3 = 2, need 3 more to reach 5
    expect(needed).toBe(3);
  });

  it('should handle zero buffer', () => {
    const needed = calculateChaptersNeeded(0, 5, 3);
    // Buffer after: 0 - 3 = -3, but treated as 0, need 5 to reach minimum
    expect(needed).toBe(8); // 5 - (0 - 3) = 8
  });
});

describe('suggestReleaseInterval', () => {
  it('should suggest reasonable interval for moderate production', () => {
    // If producing 3 chapters/week, suggest 2-3 day interval
    const interval = suggestReleaseInterval(3, 5);
    expect(interval).toBeGreaterThanOrEqual(2);
    expect(interval).toBeLessThanOrEqual(7);
  });

  it('should default to weekly for zero production', () => {
    const interval = suggestReleaseInterval(0, 5);
    expect(interval).toBe(7);
  });

  it('should cap at weekly', () => {
    const interval = suggestReleaseInterval(0.5, 5);
    expect(interval).toBe(7);
  });

  it('should allow faster releases for high production', () => {
    // If producing 7 chapters/week, can release daily
    const interval = suggestReleaseInterval(7, 5);
    expect(interval).toBeLessThanOrEqual(2);
  });
});
