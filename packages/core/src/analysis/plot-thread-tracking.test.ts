/**
 * Tests for plot thread tracking data generation
 */

import { describe, it, expect, vi } from 'vitest';

import {
  generatePlotThreadTrackingData,
  generateAllPlotThreadTracking,
  generateThreadActivityHeatmap,
  touchTypeToNumber,
  numberToTouchType,
  getThreadsWithDanglingPromises,
  getThreadsMissingTouches,
  getIncompleteThreads,
  getDanglingThreads,
  getThreadsByStatus,
  getThreadsByType,
  getTopThreadsByTouches,
  getThreadsByPriority,
  getPromiseFulfillmentSummary,
  type PlotThreadTrackingDependencies,
} from './plot-thread-tracking';
import type {
  ContentAnalysis,
  PlotThread,
  PlotThreadTrackingData,
  Structure,
} from '@repo/types';

// Create test plot thread
function createTestPlotThread(
  id: string,
  name: string,
  overrides: Partial<PlotThread> = {}
): PlotThread {
  const now = new Date().toISOString();
  return {
    id,
    name,
    description: `Description for ${name}`,
    type: 'subplot',
    status: 'active',
    scope: 'arc',
    priority: 50,
    involvedCharacters: [],
    relatedLocations: [],
    promises: [],
    touches: [],
    childThreads: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create test structure
function createTestStructure(overrides: Partial<Structure> = {}): Structure {
  const now = new Date().toISOString();
  return {
    id: 'book-1',
    type: 'book',
    title: 'Test Book',
    summary: 'A test book',
    beats: [],
    order: 0,
    children: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Create test chapter
function createTestChapter(
  id: string,
  order: number,
  title: string = `Chapter ${order + 1}`
): Structure {
  const now = new Date().toISOString();
  return {
    id,
    type: 'chapter',
    title,
    summary: `Summary for ${title}`,
    beats: [],
    order,
    children: [],
    parentId: 'book-1',
    createdAt: now,
    updatedAt: now,
  };
}

// Create test analysis
function createTestAnalysis(
  contentId: string,
  threadTouches: Array<{
    threadId: string;
    type: 'introduction' | 'development' | 'complication' | 'climax' | 'resolution';
  }>
): ContentAnalysis {
  return {
    id: `analysis-${contentId}`,
    contentId,
    contentVersion: 1,
    tensionScore: { score: 50, explanation: 'Test' },
    paceScore: { score: 50, explanation: 'Test' },
    characterVoiceScores: {},
    continuityIssues: [],
    wordCount: 2500,
    readingTime: 12,
    characterAppearances: [],
    locationAppearances: [],
    threadTouches,
    analyzedAt: new Date().toISOString(),
  };
}

// Create mock dependencies
function createMockDeps(
  contentMap: Map<string, string>, // structureId -> contentId
  analysisMap: Map<string, ContentAnalysis> // contentId -> analysis
): PlotThreadTrackingDependencies {
  return {
    analysisRepository: {
      findLatest: vi.fn((_projectId: string, contentId: string) => {
        return analysisMap.get(contentId);
      }),
    } as unknown as PlotThreadTrackingDependencies['analysisRepository'],
    contentRepository: {
      findByStructure: vi.fn((_projectId: string, structureId: string) => {
        const contentId = contentMap.get(structureId);
        if (!contentId) return undefined;
        return {
          id: contentId,
          structureId,
          status: 'approved',
          currentVersion: 1,
          text: 'Test content',
          versions: [],
          reviews: [],
          generationHistory: [],
          locked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
    } as unknown as PlotThreadTrackingDependencies['contentRepository'],
  };
}

describe('touchTypeToNumber', () => {
  it('should return 0 for undefined', () => {
    expect(touchTypeToNumber(undefined)).toBe(0);
  });

  it('should return 1 for introduction', () => {
    expect(touchTypeToNumber('introduction')).toBe(1);
  });

  it('should return 2 for development', () => {
    expect(touchTypeToNumber('development')).toBe(2);
  });

  it('should return 3 for complication', () => {
    expect(touchTypeToNumber('complication')).toBe(3);
  });

  it('should return 4 for climax', () => {
    expect(touchTypeToNumber('climax')).toBe(4);
  });

  it('should return 5 for resolution', () => {
    expect(touchTypeToNumber('resolution')).toBe(5);
  });
});

describe('numberToTouchType', () => {
  it('should return undefined for 0', () => {
    expect(numberToTouchType(0)).toBeUndefined();
  });

  it('should return introduction for 1', () => {
    expect(numberToTouchType(1)).toBe('introduction');
  });

  it('should return development for 2', () => {
    expect(numberToTouchType(2)).toBe('development');
  });

  it('should return complication for 3', () => {
    expect(numberToTouchType(3)).toBe('complication');
  });

  it('should return climax for 4', () => {
    expect(numberToTouchType(4)).toBe('climax');
  });

  it('should return resolution for 5', () => {
    expect(numberToTouchType(5)).toBe('resolution');
  });
});

describe('generatePlotThreadTrackingData', () => {
  it('should generate tracking data for a thread with touches', () => {
    const thread = createTestPlotThread('thread-1', 'Mystery Plot');
    const chapters = [
      {
        structureId: 'ch-1',
        position: 1,
        title: 'Chapter 1',
        contentId: 'content-1',
        analysis: createTestAnalysis('content-1', [
          { threadId: 'thread-1', type: 'introduction' },
        ]),
      },
      {
        structureId: 'ch-2',
        position: 2,
        title: 'Chapter 2',
        contentId: 'content-2',
        analysis: createTestAnalysis('content-2', [
          { threadId: 'thread-1', type: 'development' },
        ]),
      },
      {
        structureId: 'ch-3',
        position: 3,
        title: 'Chapter 3',
        contentId: 'content-3',
        analysis: createTestAnalysis('content-3', []),
      },
    ];

    const result = generatePlotThreadTrackingData(thread, chapters);

    expect(result.threadId).toBe('thread-1');
    expect(result.threadName).toBe('Mystery Plot');
    expect(result.statusPoints).toHaveLength(2);
    expect(result.summary.totalTouches).toBe(2);
    expect(result.summary.firstTouchPosition).toBe(1);
    expect(result.summary.lastTouchPosition).toBe(2);
    expect(result.summary.activeDuration).toBe(1);
    expect(result.summary.touchDensity).toBeCloseTo(2 / 3);
    expect(result.introduction).toEqual({ position: 1, contentId: 'content-1' });
  });

  it('should handle thread with no touches', () => {
    const thread = createTestPlotThread('thread-1', 'Mystery Plot');
    const chapters = [
      {
        structureId: 'ch-1',
        position: 1,
        title: 'Chapter 1',
        contentId: 'content-1',
        analysis: createTestAnalysis('content-1', []),
      },
    ];

    const result = generatePlotThreadTrackingData(thread, chapters);

    expect(result.statusPoints).toHaveLength(0);
    expect(result.summary.totalTouches).toBe(0);
    expect(result.summary.firstTouchPosition).toBeUndefined();
    expect(result.summary.lastTouchPosition).toBeUndefined();
  });

  it('should detect resolution point', () => {
    const thread = createTestPlotThread('thread-1', 'Mystery Plot', {
      status: 'resolved',
    });
    const chapters = [
      {
        structureId: 'ch-1',
        position: 1,
        title: 'Chapter 1',
        contentId: 'content-1',
        analysis: createTestAnalysis('content-1', [
          { threadId: 'thread-1', type: 'introduction' },
        ]),
      },
      {
        structureId: 'ch-2',
        position: 2,
        title: 'Chapter 2',
        contentId: 'content-2',
        analysis: createTestAnalysis('content-2', [
          { threadId: 'thread-1', type: 'resolution' },
        ]),
      },
    ];

    const result = generatePlotThreadTrackingData(thread, chapters);

    expect(result.resolution).toEqual({ position: 2, contentId: 'content-2' });
    expect(result.summary.isCompleted).toBe(true);
    expect(result.summary.isDangling).toBe(false);
  });

  it('should track promises', () => {
    const thread = createTestPlotThread('thread-1', 'Mystery Plot', {
      promises: [
        {
          id: 'promise-1',
          description: 'Reveal the killer',
          madeAt: { contentId: 'content-1' },
          fulfilledAt: { contentId: 'content-3' },
          expectedPayoff: 'medium-term',
          status: 'fulfilled',
        },
        {
          id: 'promise-2',
          description: 'Find the treasure',
          madeAt: { contentId: 'content-2' },
          expectedPayoff: 'long-term',
          status: 'pending',
        },
      ],
    });

    const chapters = [
      { structureId: 'ch-1', position: 1, title: 'Chapter 1', contentId: 'content-1' },
      { structureId: 'ch-2', position: 2, title: 'Chapter 2', contentId: 'content-2' },
      { structureId: 'ch-3', position: 3, title: 'Chapter 3', contentId: 'content-3' },
    ];

    const result = generatePlotThreadTrackingData(thread, chapters);

    expect(result.promises).toHaveLength(2);
    expect(result.promises[0].promiseId).toBe('promise-1');
    expect(result.promises[0].madeAtPosition).toBe(1);
    expect(result.promises[0].fulfilledAtPosition).toBe(3);
    expect(result.promises[0].chaptersToFulfillment).toBe(2);
    expect(result.summary.totalPromises).toBe(2);
    expect(result.summary.fulfilledPromises).toBe(1);
    expect(result.summary.unfulfilledCount).toBe(1);
    expect(result.summary.promiseFulfillmentRate).toBe(0.5);
  });

  it('should detect dormant periods', () => {
    const thread = createTestPlotThread('thread-1', 'Mystery Plot');
    const chapters = [
      {
        structureId: 'ch-1',
        position: 1,
        title: 'Chapter 1',
        contentId: 'content-1',
        analysis: createTestAnalysis('content-1', [
          { threadId: 'thread-1', type: 'introduction' },
        ]),
      },
      // Chapters 2-6 have no touches (5 chapter gap)
      { structureId: 'ch-2', position: 2, title: 'Chapter 2', contentId: 'content-2', analysis: createTestAnalysis('content-2', []) },
      { structureId: 'ch-3', position: 3, title: 'Chapter 3', contentId: 'content-3', analysis: createTestAnalysis('content-3', []) },
      { structureId: 'ch-4', position: 4, title: 'Chapter 4', contentId: 'content-4', analysis: createTestAnalysis('content-4', []) },
      { structureId: 'ch-5', position: 5, title: 'Chapter 5', contentId: 'content-5', analysis: createTestAnalysis('content-5', []) },
      { structureId: 'ch-6', position: 6, title: 'Chapter 6', contentId: 'content-6', analysis: createTestAnalysis('content-6', []) },
      {
        structureId: 'ch-7',
        position: 7,
        title: 'Chapter 7',
        contentId: 'content-7',
        analysis: createTestAnalysis('content-7', [
          { threadId: 'thread-1', type: 'development' },
        ]),
      },
    ];

    const result = generatePlotThreadTrackingData(thread, chapters);

    expect(result.summary.dormantPeriods).toHaveLength(1);
    expect(result.summary.dormantPeriods[0].startPosition).toBe(1);
    expect(result.summary.dormantPeriods[0].endPosition).toBe(7);
    expect(result.summary.dormantPeriods[0].duration).toBe(5);
    expect(result.summary.totalDormantChapters).toBe(5);
  });

  it('should detect dangling thread', () => {
    const thread = createTestPlotThread('thread-1', 'Mystery Plot', {
      status: 'active',
    });

    // Create 15 chapters, with touches only in 1-3
    const chapters = Array.from({ length: 15 }, (_, i) => ({
      structureId: `ch-${i + 1}`,
      position: i + 1,
      title: `Chapter ${i + 1}`,
      contentId: `content-${i + 1}`,
      analysis: createTestAnalysis(
        `content-${i + 1}`,
        i < 3 ? [{ threadId: 'thread-1', type: 'development' as const }] : []
      ),
    }));

    const result = generatePlotThreadTrackingData(thread, chapters);

    expect(result.summary.isDangling).toBe(true);
  });
});

describe('generateAllPlotThreadTracking', () => {
  it('should generate tracking data for all threads', () => {
    const book = createTestStructure({
      children: [createTestChapter('ch-1', 0), createTestChapter('ch-2', 1)],
    });

    const threads = [
      createTestPlotThread('thread-1', 'Main Plot'),
      createTestPlotThread('thread-2', 'Subplot'),
    ];

    const contentMap = new Map([
      ['ch-1', 'content-1'],
      ['ch-2', 'content-2'],
    ]);

    const analysisMap = new Map([
      [
        'content-1',
        createTestAnalysis('content-1', [
          { threadId: 'thread-1', type: 'introduction' },
          { threadId: 'thread-2', type: 'introduction' },
        ]),
      ],
      [
        'content-2',
        createTestAnalysis('content-2', [{ threadId: 'thread-1', type: 'development' }]),
      ],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateAllPlotThreadTracking(
      { projectId: 'project-1', rootStructure: book, plotThreads: threads },
      deps
    );

    expect(result).toHaveLength(2);
    expect(result[0].threadId).toBe('thread-1');
    expect(result[0].summary.totalTouches).toBe(2);
    expect(result[1].threadId).toBe('thread-2');
    expect(result[1].summary.totalTouches).toBe(1);
  });
});

describe('generateThreadActivityHeatmap', () => {
  it('should generate activity heatmap matrix', () => {
    const book = createTestStructure({
      children: [
        createTestChapter('ch-1', 0, 'Chapter 1'),
        createTestChapter('ch-2', 1, 'Chapter 2'),
        createTestChapter('ch-3', 2, 'Chapter 3'),
      ],
    });

    const threads = [
      createTestPlotThread('thread-1', 'Main Plot'),
      createTestPlotThread('thread-2', 'Subplot'),
    ];

    const contentMap = new Map([
      ['ch-1', 'content-1'],
      ['ch-2', 'content-2'],
      ['ch-3', 'content-3'],
    ]);

    const analysisMap = new Map([
      [
        'content-1',
        createTestAnalysis('content-1', [
          { threadId: 'thread-1', type: 'introduction' },
        ]),
      ],
      [
        'content-2',
        createTestAnalysis('content-2', [
          { threadId: 'thread-1', type: 'development' },
          { threadId: 'thread-2', type: 'introduction' },
        ]),
      ],
      [
        'content-3',
        createTestAnalysis('content-3', [{ threadId: 'thread-2', type: 'resolution' }]),
      ],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateThreadActivityHeatmap(
      { projectId: 'project-1', rootStructure: book, plotThreads: threads },
      deps
    );

    expect(result.threadIds).toEqual(['thread-1', 'thread-2']);
    expect(result.threadNames).toEqual(['Main Plot', 'Subplot']);
    expect(result.positions).toEqual([1, 2, 3]);
    expect(result.titles).toEqual(['Chapter 1', 'Chapter 2', 'Chapter 3']);

    // Thread 1: introduction(1), development(2), no touch(0)
    expect(result.matrix[0]).toEqual([1, 2, 0]);
    // Thread 2: no touch(0), introduction(1), resolution(5)
    expect(result.matrix[1]).toEqual([0, 1, 5]);
  });

  it('should handle chapters without analysis', () => {
    const book = createTestStructure({
      children: [createTestChapter('ch-1', 0), createTestChapter('ch-2', 1)],
    });

    const threads = [createTestPlotThread('thread-1', 'Main Plot')];

    const contentMap = new Map([
      ['ch-1', 'content-1'],
      // ch-2 has no content
    ]);

    const analysisMap = new Map([
      [
        'content-1',
        createTestAnalysis('content-1', [
          { threadId: 'thread-1', type: 'introduction' },
        ]),
      ],
    ]);

    const deps = createMockDeps(contentMap, analysisMap);

    const result = generateThreadActivityHeatmap(
      { projectId: 'project-1', rootStructure: book, plotThreads: threads },
      deps
    );

    expect(result.matrix[0]).toEqual([1, 0]);
  });
});

describe('getThreadsWithDanglingPromises', () => {
  it('should identify threads with overdue promises', () => {
    const trackingData: PlotThreadTrackingData[] = [
      {
        threadId: 'thread-1',
        threadName: 'Main Plot',
        threadType: 'main-plot',
        scope: 'book',
        status: 'active',
        priority: 80,
        statusPoints: [],
        promises: [
          {
            promiseId: 'promise-1',
            description: 'Reveal secret',
            madeAtPosition: 1,
            expectedPayoff: 'immediate',
            status: 'pending',
          },
        ],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 1,
          firstTouchPosition: 1,
          lastTouchPosition: 1,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 1,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 1,
          isCompleted: false,
          isDangling: false,
          touchDensity: 0.1,
        },
      },
    ];

    const result = getThreadsWithDanglingPromises(trackingData, 10);

    expect(result).toHaveLength(1);
    expect(result[0].threadId).toBe('thread-1');
  });

  it('should not flag series-end promises as overdue', () => {
    const trackingData: PlotThreadTrackingData[] = [
      {
        threadId: 'thread-1',
        threadName: 'Main Plot',
        threadType: 'main-plot',
        scope: 'series',
        status: 'active',
        priority: 80,
        statusPoints: [],
        promises: [
          {
            promiseId: 'promise-1',
            description: 'Final revelation',
            madeAtPosition: 1,
            expectedPayoff: 'series-end',
            status: 'pending',
          },
        ],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 1,
          firstTouchPosition: 1,
          lastTouchPosition: 1,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 1,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 1,
          isCompleted: false,
          isDangling: false,
          touchDensity: 0.1,
        },
      },
    ];

    const result = getThreadsWithDanglingPromises(trackingData, 100);

    expect(result).toHaveLength(0);
  });
});

describe('getThreadsMissingTouches', () => {
  it('should identify threads missing recent touches', () => {
    const trackingData: PlotThreadTrackingData[] = [
      {
        threadId: 'thread-1',
        threadName: 'Forgotten Plot',
        threadType: 'subplot',
        scope: 'arc',
        status: 'active',
        priority: 50,
        statusPoints: [],
        promises: [],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 2,
          firstTouchPosition: 1,
          lastTouchPosition: 2,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 0,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 0,
          isCompleted: false,
          isDangling: false,
          touchDensity: 0.2,
        },
      },
    ];

    const result = getThreadsMissingTouches(trackingData, 5, 10);

    expect(result).toHaveLength(1);
    expect(result[0].threadId).toBe('thread-1');
  });

  it('should exclude completed threads', () => {
    const trackingData: PlotThreadTrackingData[] = [
      {
        threadId: 'thread-1',
        threadName: 'Resolved Plot',
        threadType: 'subplot',
        scope: 'arc',
        status: 'resolved',
        priority: 50,
        statusPoints: [],
        promises: [],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 2,
          firstTouchPosition: 1,
          lastTouchPosition: 2,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 0,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 0,
          isCompleted: true,
          isDangling: false,
          touchDensity: 0.2,
        },
      },
    ];

    const result = getThreadsMissingTouches(trackingData, 5, 10);

    expect(result).toHaveLength(0);
  });
});

describe('getIncompleteThreads', () => {
  it('should identify incomplete threads', () => {
    const trackingData: PlotThreadTrackingData[] = [
      {
        threadId: 'thread-1',
        threadName: 'Active Plot',
        threadType: 'subplot',
        scope: 'arc',
        status: 'active',
        priority: 50,
        statusPoints: [],
        promises: [],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 5,
          firstTouchPosition: 1,
          lastTouchPosition: 5,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 0,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 0,
          isCompleted: false,
          isDangling: false,
          touchDensity: 0.5,
        },
      },
      {
        threadId: 'thread-2',
        threadName: 'Resolved Plot',
        threadType: 'subplot',
        scope: 'arc',
        status: 'resolved',
        priority: 50,
        statusPoints: [],
        promises: [],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 3,
          firstTouchPosition: 1,
          lastTouchPosition: 3,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 0,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 0,
          isCompleted: true,
          isDangling: false,
          touchDensity: 0.3,
        },
      },
    ];

    const result = getIncompleteThreads(trackingData);

    expect(result).toHaveLength(1);
    expect(result[0].threadId).toBe('thread-1');
  });
});

describe('getDanglingThreads', () => {
  it('should return threads marked as dangling', () => {
    const trackingData: PlotThreadTrackingData[] = [
      {
        threadId: 'thread-1',
        threadName: 'Dangling Plot',
        threadType: 'subplot',
        scope: 'arc',
        status: 'active',
        priority: 50,
        statusPoints: [],
        promises: [],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 1,
          firstTouchPosition: 1,
          lastTouchPosition: 1,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 0,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 0,
          isCompleted: false,
          isDangling: true,
          touchDensity: 0.1,
        },
      },
      {
        threadId: 'thread-2',
        threadName: 'Active Plot',
        threadType: 'subplot',
        scope: 'arc',
        status: 'active',
        priority: 50,
        statusPoints: [],
        promises: [],
        involvedCharacterIds: [],
        summary: {
          totalTouches: 5,
          firstTouchPosition: 1,
          lastTouchPosition: 10,
          dormantPeriods: [],
          totalDormantChapters: 0,
          totalPromises: 0,
          fulfilledPromises: 0,
          promiseFulfillmentRate: 0,
          unfulfilledCount: 0,
          isCompleted: false,
          isDangling: false,
          touchDensity: 0.5,
        },
      },
    ];

    const result = getDanglingThreads(trackingData);

    expect(result).toHaveLength(1);
    expect(result[0].threadId).toBe('thread-1');
  });
});

describe('getThreadsByStatus', () => {
  it('should filter threads by status', () => {
    const trackingData: PlotThreadTrackingData[] = [
      createTrackingData('thread-1', 'active'),
      createTrackingData('thread-2', 'dormant'),
      createTrackingData('thread-3', 'active'),
      createTrackingData('thread-4', 'resolved'),
    ];

    const result = getThreadsByStatus(trackingData, 'active');

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.threadId)).toEqual(['thread-1', 'thread-3']);
  });
});

describe('getThreadsByType', () => {
  it('should filter threads by type', () => {
    const trackingData: PlotThreadTrackingData[] = [
      createTrackingData('thread-1', 'active', 'main-plot'),
      createTrackingData('thread-2', 'active', 'subplot'),
      createTrackingData('thread-3', 'active', 'mystery'),
      createTrackingData('thread-4', 'active', 'subplot'),
    ];

    const result = getThreadsByType(trackingData, 'subplot');

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.threadId)).toEqual(['thread-2', 'thread-4']);
  });
});

describe('getTopThreadsByTouches', () => {
  it('should return top threads by touch count', () => {
    const trackingData: PlotThreadTrackingData[] = [
      createTrackingData('thread-1', 'active', 'subplot', 5),
      createTrackingData('thread-2', 'active', 'subplot', 15),
      createTrackingData('thread-3', 'active', 'subplot', 10),
    ];

    const result = getTopThreadsByTouches(trackingData, 2);

    expect(result).toHaveLength(2);
    expect(result[0].threadId).toBe('thread-2'); // 15 touches
    expect(result[1].threadId).toBe('thread-3'); // 10 touches
  });
});

describe('getThreadsByPriority', () => {
  it('should sort threads by priority', () => {
    const trackingData: PlotThreadTrackingData[] = [
      createTrackingDataWithPriority('thread-1', 50),
      createTrackingDataWithPriority('thread-2', 80),
      createTrackingDataWithPriority('thread-3', 30),
    ];

    const result = getThreadsByPriority(trackingData);

    expect(result[0].threadId).toBe('thread-2'); // 80 priority
    expect(result[1].threadId).toBe('thread-1'); // 50 priority
    expect(result[2].threadId).toBe('thread-3'); // 30 priority
  });
});

describe('getPromiseFulfillmentSummary', () => {
  it('should calculate overall promise statistics', () => {
    const trackingData: PlotThreadTrackingData[] = [
      {
        ...createTrackingData('thread-1', 'active'),
        promises: [
          { promiseId: 'p1', description: '', expectedPayoff: 'short-term', status: 'fulfilled' },
          { promiseId: 'p2', description: '', expectedPayoff: 'medium-term', status: 'pending' },
        ],
      },
      {
        ...createTrackingData('thread-2', 'active'),
        promises: [
          { promiseId: 'p3', description: '', expectedPayoff: 'long-term', status: 'subverted' },
          { promiseId: 'p4', description: '', expectedPayoff: 'short-term', status: 'abandoned' },
          { promiseId: 'p5', description: '', expectedPayoff: 'immediate', status: 'pending' },
        ],
      },
    ];

    const result = getPromiseFulfillmentSummary(trackingData);

    expect(result.totalPromises).toBe(5);
    expect(result.fulfilledPromises).toBe(1);
    expect(result.pendingPromises).toBe(2);
    expect(result.subvertedPromises).toBe(1);
    expect(result.abandonedPromises).toBe(1);
    expect(result.overallFulfillmentRate).toBe(0.4); // 2/5 (fulfilled + subverted)
  });
});

// Helper function to create tracking data for tests
function createTrackingData(
  threadId: string,
  status: PlotThread['status'],
  type: PlotThread['type'] = 'subplot',
  totalTouches: number = 1
): PlotThreadTrackingData {
  return {
    threadId,
    threadName: `Thread ${threadId}`,
    threadType: type,
    scope: 'arc',
    status,
    priority: 50,
    statusPoints: [],
    promises: [],
    involvedCharacterIds: [],
    summary: {
      totalTouches,
      dormantPeriods: [],
      totalDormantChapters: 0,
      totalPromises: 0,
      fulfilledPromises: 0,
      promiseFulfillmentRate: 0,
      unfulfilledCount: 0,
      isCompleted: status === 'resolved' || status === 'abandoned',
      isDangling: false,
      touchDensity: 0.1,
    },
  };
}

function createTrackingDataWithPriority(
  threadId: string,
  priority: number
): PlotThreadTrackingData {
  return {
    ...createTrackingData(threadId, 'active'),
    priority,
  };
}
