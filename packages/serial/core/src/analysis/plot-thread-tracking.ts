/**
 * Plot thread tracking data generation
 *
 * Tracks plot thread status, timeline, dangling detection, and promise/payoff matching
 * throughout the narrative.
 *
 * Phase 4.3 deliverables:
 * - Thread status tracking (active, dormant, resolved)
 * - Thread timeline (when introduced, touched, resolved)
 * - Dangling thread detection
 * - Promise/payoff matching
 */

import type {
  ContentAnalysis,
  DormantPeriod,
  PlotThread,
  PlotThreadTrackingData,
  PromiseTracking,
  Structure,
  ThreadActivityHeatmap,
  ThreadStatusPoint,
  ThreadTouchType,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';

/**
 * Input for plot thread tracking generation
 */
export interface PlotThreadTrackingInput {
  /** Project ID */
  projectId: string;
  /** Root structure (book or arc) */
  rootStructure: Structure;
  /** Plot threads to track */
  plotThreads: PlotThread[];
}

/**
 * Dependencies for plot thread tracking
 */
export interface PlotThreadTrackingDependencies {
  /** Analysis repository for getting thread touches from analysis */
  analysisRepository: AnalysisRepository;
  /** Content repository for getting content linked to structures */
  contentRepository: ContentRepository;
}

/**
 * Configuration for dangling thread detection
 */
export interface DanglingDetectionConfig {
  /** Number of chapters without a touch to consider dormant */
  dormantThreshold: number;
  /** Number of chapters without a touch to consider dangling (for active threads) */
  danglingThreshold: number;
}

/**
 * Default dangling detection configuration
 */
export const DEFAULT_DANGLING_CONFIG: DanglingDetectionConfig = {
  dormantThreshold: 5,
  danglingThreshold: 10,
};

/**
 * Chapter info for tracking
 */
interface ChapterInfo {
  structureId: string;
  position: number;
  title: string;
  contentId?: string;
  analysis?: ContentAnalysis;
}

/**
 * Extract chapters from structure in reading order
 */
function extractChapters(rootStructure: Structure): ChapterInfo[] {
  const chapters: ChapterInfo[] = [];
  let position = 0;

  function traverse(node: Structure): void {
    if (node.type === 'chapter' || node.type === 'scene') {
      position++;
      chapters.push({
        structureId: node.id,
        position,
        title: node.title,
      });
    }

    const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
    for (const child of sortedChildren) {
      traverse(child);
    }
  }

  traverse(rootStructure);
  return chapters;
}

/**
 * Get content and analysis for chapters
 */
function enrichChaptersWithAnalysis(
  projectId: string,
  chapters: ChapterInfo[],
  deps: PlotThreadTrackingDependencies
): ChapterInfo[] {
  return chapters.map((chapter) => {
    const content = deps.contentRepository.findByStructure(projectId, chapter.structureId);
    if (!content) return chapter;

    const analysis = deps.analysisRepository.findLatest(projectId, content.id);
    return {
      ...chapter,
      contentId: content.id,
      analysis,
    };
  });
}

/**
 * Convert touch type string to numeric value
 * 0 = no touch, 1 = introduction, 2 = development, 3 = complication, 4 = climax, 5 = resolution
 */
export function touchTypeToNumber(touchType: ThreadTouchType | undefined): number {
  if (!touchType) return 0;
  switch (touchType) {
    case 'introduction':
      return 1;
    case 'development':
      return 2;
    case 'complication':
      return 3;
    case 'climax':
      return 4;
    case 'resolution':
      return 5;
    default:
      return 0;
  }
}

/**
 * Convert numeric value to touch type
 */
export function numberToTouchType(num: number): ThreadTouchType | undefined {
  switch (num) {
    case 1:
      return 'introduction';
    case 2:
      return 'development';
    case 3:
      return 'complication';
    case 4:
      return 'climax';
    case 5:
      return 'resolution';
    default:
      return undefined;
  }
}

/**
 * Get thread touches from enriched chapters
 */
function getThreadTouches(threadId: string, chapters: ChapterInfo[]): ThreadStatusPoint[] {
  const touches: ThreadStatusPoint[] = [];

  for (const chapter of chapters) {
    if (!chapter.analysis) continue;

    const touch = chapter.analysis.threadTouches.find((t) => t.threadId === threadId);

    if (touch) {
      touches.push({
        structureId: chapter.structureId,
        contentId: chapter.contentId,
        position: chapter.position,
        title: chapter.title,
        touchType: touch.type,
      });
    }
  }

  return touches;
}

/**
 * Calculate dormant periods from touches
 */
function calculateDormantPeriods(
  touches: ThreadStatusPoint[],
  totalChapters: number,
  config: DanglingDetectionConfig
): DormantPeriod[] {
  const dormantPeriods: DormantPeriod[] = [];

  if (touches.length === 0) return dormantPeriods;

  // Sort by position
  const sortedTouches = [...touches].sort((a, b) => a.position - b.position);

  // Check gaps between consecutive touches
  for (let i = 0; i < sortedTouches.length - 1; i++) {
    const gap = sortedTouches[i + 1].position - sortedTouches[i].position - 1;
    if (gap >= config.dormantThreshold) {
      dormantPeriods.push({
        startPosition: sortedTouches[i].position,
        endPosition: sortedTouches[i + 1].position,
        duration: gap,
      });
    }
  }

  // Check gap from last touch to current position (only if thread isn't resolved)
  const lastTouch = sortedTouches[sortedTouches.length - 1];
  if (lastTouch.touchType !== 'resolution') {
    const gapToEnd = totalChapters - lastTouch.position;
    if (gapToEnd >= config.dormantThreshold) {
      dormantPeriods.push({
        startPosition: lastTouch.position,
        endPosition: totalChapters,
        duration: gapToEnd,
      });
    }
  }

  return dormantPeriods;
}

/**
 * Build promise tracking data from thread promises
 */
function buildPromiseTracking(
  thread: PlotThread,
  chapters: ChapterInfo[]
): PromiseTracking[] {
  return thread.promises.map((promise) => {
    // Find position for madeAt
    let madeAtPosition: number | undefined;
    if (promise.madeAt?.contentId) {
      const chapter = chapters.find((c) => c.contentId === promise.madeAt?.contentId);
      madeAtPosition = chapter?.position;
    }

    // Find position for fulfilledAt
    let fulfilledAtPosition: number | undefined;
    if (promise.fulfilledAt?.contentId) {
      const chapter = chapters.find((c) => c.contentId === promise.fulfilledAt?.contentId);
      fulfilledAtPosition = chapter?.position;
    }

    // Calculate chapters to fulfillment
    let chaptersToFulfillment: number | undefined;
    if (
      madeAtPosition !== undefined &&
      fulfilledAtPosition !== undefined &&
      promise.status === 'fulfilled'
    ) {
      chaptersToFulfillment = fulfilledAtPosition - madeAtPosition;
    }

    return {
      promiseId: promise.id,
      description: promise.description,
      madeAtPosition,
      madeAtContentId: promise.madeAt?.contentId,
      expectedPayoff: promise.expectedPayoff,
      status: promise.status,
      fulfilledAtPosition,
      fulfilledAtContentId: promise.fulfilledAt?.contentId,
      chaptersToFulfillment,
    };
  });
}

/**
 * Calculate promise summary statistics
 */
function calculatePromiseSummary(promises: PromiseTracking[]): {
  totalPromises: number;
  fulfilledPromises: number;
  promiseFulfillmentRate: number;
  unfulfilledCount: number;
  averageChaptersToFulfillment: number | undefined;
} {
  const totalPromises = promises.length;
  const fulfilledPromises = promises.filter(
    (p) => p.status === 'fulfilled' || p.status === 'subverted'
  ).length;
  const promiseFulfillmentRate = totalPromises > 0 ? fulfilledPromises / totalPromises : 0;
  const unfulfilledCount = promises.filter((p) => p.status === 'pending').length;

  // Calculate average chapters to fulfillment
  const fulfilledWithDuration = promises.filter(
    (p) => p.chaptersToFulfillment !== undefined && p.chaptersToFulfillment >= 0
  );
  const averageChaptersToFulfillment =
    fulfilledWithDuration.length > 0
      ? fulfilledWithDuration.reduce((sum, p) => sum + (p.chaptersToFulfillment ?? 0), 0) /
        fulfilledWithDuration.length
      : undefined;

  return {
    totalPromises,
    fulfilledPromises,
    promiseFulfillmentRate,
    unfulfilledCount,
    averageChaptersToFulfillment,
  };
}

/**
 * Detect if a thread is dangling
 *
 * A thread is dangling if it's active or dormant and hasn't been touched recently.
 */
function isDanglingThread(
  thread: PlotThread,
  touches: ThreadStatusPoint[],
  totalChapters: number,
  config: DanglingDetectionConfig
): boolean {
  // Completed threads can't be dangling
  if (thread.status === 'resolved' || thread.status === 'abandoned' || thread.status === 'planned') {
    return false;
  }

  // No touches means dangling if active
  if (touches.length === 0) {
    return thread.status === 'active';
  }

  // Check if last touch is too far back
  const sortedTouches = [...touches].sort((a, b) => a.position - b.position);
  const lastTouch = sortedTouches[sortedTouches.length - 1];

  // If last touch was resolution, not dangling
  if (lastTouch.touchType === 'resolution') {
    return false;
  }

  const gapToEnd = totalChapters - lastTouch.position;
  return gapToEnd >= config.danglingThreshold;
}

/**
 * Generate tracking data for a single plot thread
 */
export function generatePlotThreadTrackingData(
  thread: PlotThread,
  chapters: ChapterInfo[],
  config: DanglingDetectionConfig = DEFAULT_DANGLING_CONFIG
): PlotThreadTrackingData {
  const touches = getThreadTouches(thread.id, chapters);
  const totalChapters = chapters.length;

  // Find introduction and resolution points
  const introTouch = touches.find((t) => t.touchType === 'introduction');
  const resolutionTouch = [...touches].reverse().find((t) => t.touchType === 'resolution');

  const introduction = introTouch
    ? { position: introTouch.position, contentId: introTouch.contentId! }
    : undefined;

  const resolution = resolutionTouch
    ? { position: resolutionTouch.position, contentId: resolutionTouch.contentId! }
    : undefined;

  // Build promise tracking
  const promises = buildPromiseTracking(thread, chapters);
  const promiseSummary = calculatePromiseSummary(promises);

  // Calculate dormant periods
  const dormantPeriods = calculateDormantPeriods(touches, totalChapters, config);
  const totalDormantChapters = dormantPeriods.reduce((sum, p) => sum + p.duration, 0);

  // Calculate touch positions
  const positions = touches.map((t) => t.position);
  const firstTouchPosition = positions.length > 0 ? Math.min(...positions) : undefined;
  const lastTouchPosition = positions.length > 0 ? Math.max(...positions) : undefined;
  const activeDuration =
    firstTouchPosition !== undefined && lastTouchPosition !== undefined
      ? lastTouchPosition - firstTouchPosition
      : undefined;

  // Determine completion and dangling status
  const isCompleted = thread.status === 'resolved' || thread.status === 'abandoned';
  const isDangling = isDanglingThread(thread, touches, totalChapters, config);

  // Calculate touch density
  const touchDensity = totalChapters > 0 ? touches.length / totalChapters : 0;

  return {
    threadId: thread.id,
    threadName: thread.name,
    threadType: thread.type,
    scope: thread.scope,
    status: thread.status,
    priority: thread.priority,
    introduction,
    resolution,
    statusPoints: touches,
    promises,
    involvedCharacterIds: thread.involvedCharacters,
    summary: {
      totalTouches: touches.length,
      firstTouchPosition,
      lastTouchPosition,
      activeDuration,
      dormantPeriods,
      totalDormantChapters,
      ...promiseSummary,
      isCompleted,
      isDangling,
      touchDensity,
    },
  };
}

/**
 * Generate tracking data for all plot threads
 */
export function generateAllPlotThreadTracking(
  input: PlotThreadTrackingInput,
  deps: PlotThreadTrackingDependencies,
  config: DanglingDetectionConfig = DEFAULT_DANGLING_CONFIG
): PlotThreadTrackingData[] {
  // Extract and enrich chapters
  const rawChapters = extractChapters(input.rootStructure);
  const chapters = enrichChaptersWithAnalysis(input.projectId, rawChapters, deps);

  // Generate tracking data for each thread
  return input.plotThreads.map((thread) =>
    generatePlotThreadTrackingData(thread, chapters, config)
  );
}

/**
 * Generate thread activity heatmap data
 *
 * Creates a matrix showing touch type for each thread in each chapter,
 * suitable for heatmap visualization.
 */
export function generateThreadActivityHeatmap(
  input: PlotThreadTrackingInput,
  deps: PlotThreadTrackingDependencies
): ThreadActivityHeatmap {
  // Extract and enrich chapters
  const rawChapters = extractChapters(input.rootStructure);
  const chapters = enrichChaptersWithAnalysis(input.projectId, rawChapters, deps);

  const threadIds = input.plotThreads.map((t) => t.id);
  const threadNames = input.plotThreads.map((t) => t.name);
  const positions = chapters.map((c) => c.position);
  const titles = chapters.map((c) => c.title);

  // Build activity matrix
  const matrix: number[][] = [];

  for (const thread of input.plotThreads) {
    const row: number[] = [];

    for (const chapter of chapters) {
      if (!chapter.analysis) {
        row.push(0);
        continue;
      }

      const touch = chapter.analysis.threadTouches.find((t) => t.threadId === thread.id);
      row.push(touchTypeToNumber(touch?.type));
    }

    matrix.push(row);
  }

  return {
    threadIds,
    threadNames,
    positions,
    titles,
    matrix,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get threads with dangling promises
 *
 * Returns threads that have pending promises that should have been fulfilled by now.
 */
export function getThreadsWithDanglingPromises(
  trackingData: PlotThreadTrackingData[],
  currentPosition: number
): PlotThreadTrackingData[] {
  return trackingData.filter((data) => {
    return data.promises.some((promise) => {
      if (promise.status !== 'pending') return false;

      // Check if promise is overdue based on expected payoff
      if (promise.madeAtPosition === undefined) return false;

      const chaptersSinceMade = currentPosition - promise.madeAtPosition;

      switch (promise.expectedPayoff) {
        case 'immediate':
          return chaptersSinceMade >= 1;
        case 'short-term':
          return chaptersSinceMade >= 5;
        case 'medium-term':
          return chaptersSinceMade >= 15;
        case 'long-term':
          return chaptersSinceMade >= 30;
        case 'series-end':
          return false; // Never considered overdue
        default:
          return false;
      }
    });
  });
}

/**
 * Get threads missing recent touches
 *
 * Returns threads that haven't been touched in the specified number of chapters.
 */
export function getThreadsMissingTouches(
  trackingData: PlotThreadTrackingData[],
  chapterThreshold: number,
  totalChapters: number
): PlotThreadTrackingData[] {
  return trackingData.filter((data) => {
    // Skip completed threads
    if (data.summary.isCompleted) return false;

    // Check last touch position
    if (data.summary.lastTouchPosition === undefined) {
      // Never touched but active
      return data.status === 'active';
    }

    const gapToEnd = totalChapters - data.summary.lastTouchPosition;
    return gapToEnd >= chapterThreshold;
  });
}

/**
 * Get incomplete threads (active/dormant with no resolution)
 *
 * Returns threads that have been started but not completed.
 */
export function getIncompleteThreads(
  trackingData: PlotThreadTrackingData[]
): PlotThreadTrackingData[] {
  return trackingData.filter((data) => {
    return (
      !data.summary.isCompleted &&
      data.summary.totalTouches > 0 &&
      data.status !== 'planned'
    );
  });
}

/**
 * Get dangling threads
 *
 * Returns threads that are marked as dangling.
 */
export function getDanglingThreads(
  trackingData: PlotThreadTrackingData[]
): PlotThreadTrackingData[] {
  return trackingData.filter((data) => data.summary.isDangling);
}

/**
 * Get threads by status
 *
 * Returns threads with the specified status.
 */
export function getThreadsByStatus(
  trackingData: PlotThreadTrackingData[],
  status: PlotThread['status']
): PlotThreadTrackingData[] {
  return trackingData.filter((data) => data.status === status);
}

/**
 * Get threads by type
 *
 * Returns threads with the specified type.
 */
export function getThreadsByType(
  trackingData: PlotThreadTrackingData[],
  type: PlotThread['type']
): PlotThreadTrackingData[] {
  return trackingData.filter((data) => data.threadType === type);
}

/**
 * Get top threads by touch count
 *
 * Returns the N threads with the most touches.
 */
export function getTopThreadsByTouches(
  trackingData: PlotThreadTrackingData[],
  count: number = 10
): PlotThreadTrackingData[] {
  return [...trackingData]
    .sort((a, b) => b.summary.totalTouches - a.summary.totalTouches)
    .slice(0, count);
}

/**
 * Get threads by priority
 *
 * Returns threads sorted by priority (highest first).
 */
export function getThreadsByPriority(
  trackingData: PlotThreadTrackingData[]
): PlotThreadTrackingData[] {
  return [...trackingData].sort((a, b) => b.priority - a.priority);
}

/**
 * Get promise fulfillment summary across all threads
 */
export function getPromiseFulfillmentSummary(trackingData: PlotThreadTrackingData[]): {
  totalPromises: number;
  fulfilledPromises: number;
  pendingPromises: number;
  subvertedPromises: number;
  abandonedPromises: number;
  overallFulfillmentRate: number;
} {
  let totalPromises = 0;
  let fulfilledPromises = 0;
  let pendingPromises = 0;
  let subvertedPromises = 0;
  let abandonedPromises = 0;

  for (const data of trackingData) {
    for (const promise of data.promises) {
      totalPromises++;
      switch (promise.status) {
        case 'fulfilled':
          fulfilledPromises++;
          break;
        case 'pending':
          pendingPromises++;
          break;
        case 'subverted':
          subvertedPromises++;
          break;
        case 'abandoned':
          abandonedPromises++;
          break;
      }
    }
  }

  const overallFulfillmentRate =
    totalPromises > 0 ? (fulfilledPromises + subvertedPromises) / totalPromises : 0;

  return {
    totalPromises,
    fulfilledPromises,
    pendingPromises,
    subvertedPromises,
    abandonedPromises,
    overallFulfillmentRate,
  };
}
