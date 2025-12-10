/**
 * Release planning for web serials
 *
 * Provides functions to:
 * - Configure release schedules
 * - Calculate buffer status (approved chapters - scheduled)
 * - Project buffer depletion
 * - Track deadlines
 *
 * Phase 5.3 implementation
 */

import type {
  BufferDepletion,
  BufferStatus,
  ChapterReleaseDataPoint,
  Content,
  ContentStatus,
  DeadlineStatus,
  DeadlineUrgency,
  ReleasePlanningConfig,
  ReleasePlanningResult,
  ReleaseProjection,
  ReleaseScheduleConfig,
  ScheduledRelease,
  SerialSettings,
  Structure,
} from '@repo/types';

import type { ContentRepository } from '../storage/repositories';

/**
 * Default configuration for release planning analysis
 */
export const DEFAULT_RELEASE_PLANNING_CONFIG: Required<ReleasePlanningConfig> = {
  projectionDays: 90,
  warningThresholdDays: 7,
  criticalThresholdDays: 3,
  referenceDate: undefined as unknown as string, // Will be set at runtime
};

/**
 * Extract chapters from a structure tree in order
 *
 * @param rootStructure - Root structure (book or arc)
 * @returns Array of chapter structures in reading order
 */
export function extractChaptersInOrder(rootStructure: Structure): Structure[] {
  const chapters: Structure[] = [];

  function traverse(structure: Structure): void {
    if (structure.type === 'chapter') {
      chapters.push(structure);
    }

    // Guard against missing children array
    if (!structure.children || !Array.isArray(structure.children)) {
      return;
    }

    // Sort children by order before traversing
    const sortedChildren = [...structure.children].sort((a, b) => a.order - b.order);
    for (const child of sortedChildren) {
      traverse(child);
    }
  }

  traverse(rootStructure);
  return chapters;
}

/**
 * Extract chapter release data points from structure and content
 *
 * @param rootStructure - Root structure (book or arc)
 * @param contentMap - Map of structure ID to content
 * @returns Array of chapter release data points
 */
export function extractChapterReleaseDataPoints(
  rootStructure: Structure,
  contentMap: Map<string, Content>
): ChapterReleaseDataPoint[] {
  const chapters = extractChaptersInOrder(rootStructure);
  const dataPoints: ChapterReleaseDataPoint[] = [];

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const content = contentMap.get(chapter.id);
    const status: ContentStatus = content?.status ?? 'draft';

    dataPoints.push({
      structureId: chapter.id,
      title: chapter.title,
      chapterNumber: i + 1,
      status,
      scheduledDate: undefined, // Would come from schedule if implemented
      publishedDate: content?.publishedAt,
      isReleasable: status === 'approved',
    });
  }

  return dataPoints;
}

/**
 * Calculate buffer status from chapter data points
 *
 * @param dataPoints - Chapter release data points
 * @param settings - Serial settings with minimum buffer
 * @returns Buffer status
 */
export function calculateBufferStatus(
  dataPoints: ChapterReleaseDataPoint[],
  settings: SerialSettings
): BufferStatus {
  const byStatus = {
    draft: dataPoints.filter((d) => d.status === 'draft').length,
    review: dataPoints.filter((d) => d.status === 'review').length,
    approved: dataPoints.filter((d) => d.status === 'approved').length,
    published: dataPoints.filter((d) => d.status === 'published').length,
  };

  // Buffer = approved chapters that haven't been scheduled yet
  // For now, we treat all approved chapters as the buffer
  const bufferSize = byStatus.approved;
  const minimumBuffer = settings.minimumBuffer;
  const isHealthy = bufferSize >= minimumBuffer;
  const deficit = isHealthy ? 0 : minimumBuffer - bufferSize;

  const warnings: string[] = [];

  if (bufferSize === 0) {
    warnings.push('No approved chapters available for release. Buffer is empty.');
  } else if (deficit > 0) {
    warnings.push(
      `Buffer is ${deficit} chapter(s) below minimum. ` +
        `Need ${deficit} more approved chapter(s) to reach minimum buffer of ${minimumBuffer}.`
    );
  } else if (bufferSize <= minimumBuffer + 2) {
    warnings.push(
      `Buffer is close to minimum (${bufferSize}/${minimumBuffer}). ` +
        `Consider building more buffer for safety.`
    );
  }

  if (byStatus.review > 3) {
    warnings.push(
      `${byStatus.review} chapters waiting in review. Consider prioritizing reviews to build buffer.`
    );
  }

  return {
    approvedCount: byStatus.approved,
    scheduledCount: 0, // Future: track scheduled releases
    publishedCount: byStatus.published,
    bufferSize,
    minimumBuffer,
    isHealthy,
    deficit,
    warnings,
  };
}

/**
 * Parse an ISO date string safely
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Format a Date to ISO string
 */
function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Get next release date from a starting point
 *
 * @param startDate - Date to start from
 * @param intervalDays - Days between releases
 * @param scheduleConfig - Schedule configuration for skipping dates
 * @returns Next valid release date
 */
export function getNextReleaseDate(
  startDate: Date,
  intervalDays: number,
  scheduleConfig?: ReleaseScheduleConfig
): Date {
  let candidate = addDays(startDate, intervalDays);

  // Skip weekends if configured
  if (scheduleConfig?.skipWeekends) {
    while (isWeekend(candidate)) {
      candidate = addDays(candidate, 1);
    }
  }

  // Skip specified dates
  if (scheduleConfig?.skipDates) {
    const skipSet = new Set(scheduleConfig.skipDates.map((d) => parseDate(d).toDateString()));
    while (skipSet.has(candidate.toDateString())) {
      candidate = addDays(candidate, 1);
      // Re-check weekends after skipping
      if (scheduleConfig.skipWeekends) {
        while (isWeekend(candidate)) {
          candidate = addDays(candidate, 1);
        }
      }
    }
  }

  return candidate;
}

/**
 * Generate scheduled releases from a start date
 *
 * @param scheduleConfig - Release schedule configuration
 * @param count - Number of releases to generate
 * @param referenceDate - Current date for determining if published
 * @returns Array of scheduled releases
 */
export function generateScheduledReleases(
  scheduleConfig: ReleaseScheduleConfig,
  count: number,
  referenceDate: Date
): ScheduledRelease[] {
  const releases: ScheduledRelease[] = [];
  let currentDate = parseDate(scheduleConfig.startDate);

  for (let i = 0; i < count; i++) {
    const releaseDate = i === 0 ? currentDate : getNextReleaseDate(
      currentDate,
      scheduleConfig.releaseIntervalDays,
      scheduleConfig
    );

    releases.push({
      date: formatDate(releaseDate),
      hasChapter: false,
      isPublished: releaseDate < referenceDate,
      releaseNumber: i + 1,
    });

    currentDate = releaseDate;
  }

  return releases;
}

/**
 * Calculate buffer depletion projection
 *
 * @param bufferStatus - Current buffer status
 * @param settings - Serial settings with release interval
 * @param config - Release planning configuration
 * @returns Buffer depletion projection
 */
export function calculateBufferDepletion(
  bufferStatus: BufferStatus,
  settings: SerialSettings,
  config: Required<ReleasePlanningConfig>
): BufferDepletion {
  const referenceDate = config.referenceDate
    ? parseDate(config.referenceDate)
    : new Date();

  const projectedReleases: ReleaseProjection[] = [];
  let currentBuffer = bufferStatus.bufferSize;
  let currentDate = referenceDate;
  let depletionDate: string | undefined;
  let daysUntilDepletion: number | undefined;
  let releasesUntilDepletion: number | undefined;

  // Project releases until buffer depletes or we hit projection limit
  const maxReleases = Math.ceil(config.projectionDays / settings.releaseInterval);

  for (let i = 0; i < maxReleases && currentBuffer >= 0; i++) {
    // Next release date
    currentDate = i === 0
      ? addDays(referenceDate, settings.releaseInterval)
      : addDays(currentDate, settings.releaseInterval);

    const daysFromNow = daysBetween(referenceDate, currentDate);
    if (daysFromNow > config.projectionDays) {
      break;
    }

    // Decrement buffer for this release
    const bufferAfter = Math.max(0, currentBuffer - 1);
    const depletesBuffer = currentBuffer > 0 && bufferAfter === 0;

    projectedReleases.push({
      date: formatDate(currentDate),
      bufferAfter,
      depletesBuffer,
      daysFromNow,
    });

    if (depletesBuffer && depletionDate === undefined) {
      depletionDate = formatDate(currentDate);
      daysUntilDepletion = daysFromNow;
      releasesUntilDepletion = i + 1;
    }

    currentBuffer = bufferAfter;
  }

  return {
    currentBuffer: bufferStatus.bufferSize,
    depletionDate,
    daysUntilDepletion,
    releasesUntilDepletion,
    willDeplete: depletionDate !== undefined,
    projectedReleases,
  };
}

/**
 * Determine deadline urgency based on buffer and time
 */
function determineUrgency(
  daysUntilDeadline: number | undefined,
  bufferSize: number,
  minimumBuffer: number,
  config: Required<ReleasePlanningConfig>
): DeadlineUrgency {
  // If buffer is critically low, always critical
  if (bufferSize === 0) {
    return 'critical';
  }

  // If no deadline, base on buffer health
  if (daysUntilDeadline === undefined) {
    return bufferSize >= minimumBuffer ? 'safe' : 'warning';
  }

  // Time-based urgency
  if (daysUntilDeadline <= config.criticalThresholdDays) {
    return 'critical';
  }

  if (daysUntilDeadline <= config.warningThresholdDays) {
    return 'warning';
  }

  // Even if time is ok, warn if buffer is low
  if (bufferSize < minimumBuffer) {
    return 'warning';
  }

  return 'safe';
}

/**
 * Calculate deadline status
 *
 * @param bufferStatus - Current buffer status
 * @param depletion - Buffer depletion projection
 * @param settings - Serial settings
 * @param config - Release planning configuration
 * @returns Deadline status
 */
export function calculateDeadlineStatus(
  bufferStatus: BufferStatus,
  depletion: BufferDepletion,
  settings: SerialSettings,
  config: Required<ReleasePlanningConfig>
): DeadlineStatus {
  const referenceDate = config.referenceDate
    ? parseDate(config.referenceDate)
    : new Date();

  // Calculate next deadline (next release date)
  const nextReleaseDate = addDays(referenceDate, settings.releaseInterval);
  const nextDeadline = formatDate(nextReleaseDate);
  const daysUntilDeadline = settings.releaseInterval;

  // Determine urgency
  const urgency = determineUrgency(
    daysUntilDeadline,
    bufferStatus.bufferSize,
    bufferStatus.minimumBuffer,
    config
  );

  // Calculate required production rate to maintain buffer
  // If releasing every N days, need 7/N chapters per week
  const releasesPerWeek = 7 / settings.releaseInterval;
  // Need to produce at least as many as releasing to maintain buffer
  let requiredChaptersPerWeek = releasesPerWeek;

  // If buffer is below minimum, need to produce more to catch up
  if (bufferStatus.deficit > 0) {
    // Add 1 extra per week to rebuild buffer
    requiredChaptersPerWeek += 1;
  }

  // Is next release covered?
  const nextReleaseReady = bufferStatus.bufferSize > 0;

  // Generate status description
  let statusDescription: string;
  if (urgency === 'critical') {
    if (bufferStatus.bufferSize === 0) {
      statusDescription = 'Buffer empty! No chapters available for next release.';
    } else {
      statusDescription = `Critical: Next release in ${daysUntilDeadline} day(s). Buffer at ${bufferStatus.bufferSize}.`;
    }
  } else if (urgency === 'warning') {
    if (bufferStatus.deficit > 0) {
      statusDescription = `Warning: Buffer ${bufferStatus.deficit} below minimum. Need ${bufferStatus.deficit} more approved chapter(s).`;
    } else {
      statusDescription = `Warning: Next release in ${daysUntilDeadline} day(s). Buffer at ${bufferStatus.bufferSize}.`;
    }
  } else {
    if (depletion.willDeplete && depletion.daysUntilDepletion !== undefined) {
      statusDescription = `Buffer will deplete in ${depletion.daysUntilDepletion} days (${depletion.releasesUntilDepletion} releases). Maintain production pace.`;
    } else {
      statusDescription = `On track: ${bufferStatus.bufferSize} chapter(s) in buffer, next release in ${daysUntilDeadline} day(s).`;
    }
  }

  return {
    nextDeadline,
    daysUntilDeadline,
    urgency,
    requiredChaptersPerWeek: Math.round(requiredChaptersPerWeek * 10) / 10,
    nextReleaseReady,
    statusDescription,
  };
}

/**
 * Generate warnings for the release schedule
 */
export function generateReleaseWarnings(
  bufferStatus: BufferStatus,
  depletion: BufferDepletion,
  deadlineStatus: DeadlineStatus,
  stats: ReleasePlanningResult['stats']
): string[] {
  const warnings: string[] = [];

  // Add buffer warnings
  warnings.push(...bufferStatus.warnings);

  // Depletion warnings
  if (depletion.willDeplete) {
    if (depletion.daysUntilDepletion !== undefined && depletion.daysUntilDepletion <= 14) {
      warnings.push(
        `Buffer will be depleted in ${depletion.daysUntilDepletion} days. ` +
          `Need to approve ${depletion.releasesUntilDepletion} chapter(s) to prevent missing releases.`
      );
    }
  }

  // Deadline warnings
  if (deadlineStatus.urgency === 'critical' && !deadlineStatus.nextReleaseReady) {
    warnings.push(
      'Critical: No approved chapter for next release. Approve a chapter immediately or risk missing the deadline.'
    );
  }

  // Production rate warnings
  if (deadlineStatus.requiredChaptersPerWeek > 5) {
    warnings.push(
      `High production rate required: ${deadlineStatus.requiredChaptersPerWeek} chapters/week. ` +
        `Consider reducing release frequency or building more buffer.`
    );
  }

  // No published chapters warning (for new projects)
  if (stats.byStatus.published === 0 && stats.totalChapters > 0) {
    warnings.push(
      'No chapters have been published yet. Once you start publishing, buffer management becomes critical.'
    );
  }

  return warnings;
}

/**
 * Main release planning analysis function
 *
 * Analyzes the release schedule and provides comprehensive feedback
 * on buffer status, depletion projection, and deadline tracking.
 *
 * @param rootStructure - Root structure (book or arc)
 * @param settings - Serial settings with buffer and interval config
 * @param contentMap - Map of structure ID to content
 * @param scheduleConfig - Release schedule configuration (optional)
 * @param config - Analysis configuration
 * @returns Complete release planning analysis
 */
export function analyzeReleasePlanning(
  rootStructure: Structure,
  settings: SerialSettings,
  contentMap: Map<string, Content> = new Map(),
  scheduleConfig?: ReleaseScheduleConfig,
  config: Partial<ReleasePlanningConfig> = {}
): ReleasePlanningResult {
  const mergedConfig: Required<ReleasePlanningConfig> = {
    projectionDays: config.projectionDays ?? DEFAULT_RELEASE_PLANNING_CONFIG.projectionDays,
    warningThresholdDays: config.warningThresholdDays ?? DEFAULT_RELEASE_PLANNING_CONFIG.warningThresholdDays,
    criticalThresholdDays: config.criticalThresholdDays ?? DEFAULT_RELEASE_PLANNING_CONFIG.criticalThresholdDays,
    referenceDate: config.referenceDate ?? new Date().toISOString(),
  };

  // Extract chapter data
  const chapters = extractChapterReleaseDataPoints(rootStructure, contentMap);

  // Calculate buffer status
  const bufferStatus = calculateBufferStatus(chapters, settings);

  // Calculate depletion projection
  const depletion = calculateBufferDepletion(bufferStatus, settings, mergedConfig);

  // Calculate deadline status
  const deadlineStatus = calculateDeadlineStatus(bufferStatus, depletion, settings, mergedConfig);

  // Generate upcoming releases
  const referenceDate = parseDate(mergedConfig.referenceDate);
  const upcomingReleases: ScheduledRelease[] = [];

  if (scheduleConfig) {
    // Use provided schedule
    const releases = generateScheduledReleases(scheduleConfig, 10, referenceDate);
    // Filter to upcoming only
    upcomingReleases.push(...releases.filter((r) => parseDate(r.date) >= referenceDate));
  } else {
    // Generate from release interval
    let currentDate = referenceDate;
    for (let i = 0; i < 10; i++) {
      currentDate = addDays(currentDate, settings.releaseInterval);
      upcomingReleases.push({
        date: formatDate(currentDate),
        hasChapter: i < bufferStatus.bufferSize,
        isPublished: false,
        releaseNumber: i + 1,
      });
    }
  }

  // Calculate statistics
  const stats: ReleasePlanningResult['stats'] = {
    totalChapters: chapters.length,
    byStatus: {
      draft: chapters.filter((c) => c.status === 'draft').length,
      review: chapters.filter((c) => c.status === 'review').length,
      approved: chapters.filter((c) => c.status === 'approved').length,
      published: chapters.filter((c) => c.status === 'published').length,
    },
    releasesPerWeek: Math.round((7 / settings.releaseInterval) * 10) / 10,
    bufferDays: bufferStatus.bufferSize * settings.releaseInterval,
  };

  // Calculate average release days from published chapters
  const publishedChapters = chapters.filter((c) => c.publishedDate);
  if (publishedChapters.length >= 2) {
    const dates = publishedChapters
      .map((c) => parseDate(c.publishedDate!))
      .sort((a, b) => a.getTime() - b.getTime());

    let totalDays = 0;
    for (let i = 1; i < dates.length; i++) {
      totalDays += daysBetween(dates[i - 1], dates[i]);
    }
    stats.averageReleaseDays = Math.round((totalDays / (dates.length - 1)) * 10) / 10;
  }

  // Generate warnings
  const warnings = generateReleaseWarnings(bufferStatus, depletion, deadlineStatus, stats);

  return {
    chapters,
    bufferStatus,
    depletion,
    deadlineStatus,
    upcomingReleases,
    stats,
    warnings,
    analyzedAt: mergedConfig.referenceDate,
  };
}

/**
 * Get a human-readable summary of the release planning status
 *
 * @param result - Release planning result
 * @param settings - Serial settings
 * @returns Human-readable summary
 */
export function getReleasePlanningSummary(
  result: ReleasePlanningResult,
  settings: SerialSettings
): string {
  const lines: string[] = [];

  lines.push(`Release Planning Summary (${result.stats.totalChapters} chapters):`);
  lines.push(`  Release interval: every ${settings.releaseInterval} day(s)`);
  lines.push(`  Minimum buffer: ${settings.minimumBuffer} chapter(s)`);
  lines.push('');

  lines.push('Buffer Status:');
  lines.push(`  Approved (buffer): ${result.bufferStatus.approvedCount}`);
  lines.push(`  Published: ${result.stats.byStatus.published}`);
  lines.push(`  In review: ${result.stats.byStatus.review}`);
  lines.push(`  Drafts: ${result.stats.byStatus.draft}`);
  lines.push(`  Buffer health: ${result.bufferStatus.isHealthy ? 'Healthy' : 'Below minimum'}`);

  if (result.bufferStatus.deficit > 0) {
    lines.push(`  Deficit: ${result.bufferStatus.deficit} chapter(s) below minimum`);
  }

  lines.push('');
  lines.push('Deadline Status:');
  lines.push(`  Urgency: ${result.deadlineStatus.urgency.toUpperCase()}`);
  lines.push(`  Next release: in ${result.deadlineStatus.daysUntilDeadline} day(s)`);
  lines.push(`  Next release ready: ${result.deadlineStatus.nextReleaseReady ? 'Yes' : 'No'}`);
  lines.push(`  Required pace: ${result.deadlineStatus.requiredChaptersPerWeek} chapters/week`);

  if (result.depletion.willDeplete) {
    lines.push('');
    lines.push('Depletion Warning:');
    lines.push(`  Buffer depletes in: ${result.depletion.daysUntilDepletion} days`);
    lines.push(`  Releases until empty: ${result.depletion.releasesUntilDepletion}`);
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return lines.join('\n');
}

/**
 * Validate release schedule configuration
 *
 * @param scheduleConfig - Schedule configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateReleaseScheduleConfig(scheduleConfig: ReleaseScheduleConfig): string[] {
  const errors: string[] = [];

  // Validate start date
  try {
    const startDate = parseDate(scheduleConfig.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Start date is not a valid date');
    }
  } catch {
    errors.push('Start date could not be parsed');
  }

  // Validate interval
  if (scheduleConfig.releaseIntervalDays < 1) {
    errors.push('Release interval must be at least 1 day');
  }

  if (scheduleConfig.releaseIntervalDays > 365) {
    errors.push('Release interval cannot exceed 365 days');
  }

  // Validate skip dates
  for (const skipDate of scheduleConfig.skipDates ?? []) {
    try {
      const date = parseDate(skipDate);
      if (isNaN(date.getTime())) {
        errors.push(`Skip date "${skipDate}" is not a valid date`);
      }
    } catch {
      errors.push(`Skip date "${skipDate}" could not be parsed`);
    }
  }

  return errors;
}

/**
 * Calculate how many chapters are needed to maintain buffer
 *
 * @param currentBuffer - Current buffer size
 * @param minimumBuffer - Minimum required buffer
 * @param releasesPlanned - Number of releases planned
 * @returns Chapters needed to maintain minimum buffer
 */
export function calculateChaptersNeeded(
  currentBuffer: number,
  minimumBuffer: number,
  releasesPlanned: number
): number {
  // After releases, buffer will be reduced
  const bufferAfterReleases = currentBuffer - releasesPlanned;

  // If we're already above minimum after releases, no additional chapters needed
  if (bufferAfterReleases >= minimumBuffer) {
    return 0;
  }

  // Need to produce enough to cover releases plus reach minimum
  return minimumBuffer - bufferAfterReleases;
}

/**
 * Suggest optimal release interval based on production capacity
 *
 * @param chaptersPerWeek - Sustainable chapter production rate
 * @param desiredBuffer - Desired buffer size (used to add safety margin)
 * @returns Suggested release interval in days
 */
export function suggestReleaseInterval(chaptersPerWeek: number, desiredBuffer: number): number {
  if (chaptersPerWeek <= 0) {
    return 7; // Default to weekly if no production
  }

  // Release interval should allow buffer to grow or stay stable
  // If producing N chapters/week, can release N chapters/week maximum
  // 7 days / N chapters = days per release
  const maxReleasesPerWeek = chaptersPerWeek;
  const minIntervalDays = Math.ceil(7 / maxReleasesPerWeek);

  // Add margin based on desired buffer - larger buffer means we can be more conservative
  // With a desired buffer of 5, use 80% of production capacity
  // With smaller desired buffers, use more of capacity
  const bufferFactor = Math.max(0.6, Math.min(0.9, 1 - desiredBuffer * 0.02));
  const suggestedInterval = Math.max(minIntervalDays, Math.ceil(7 / (chaptersPerWeek * bufferFactor)));

  return Math.min(suggestedInterval, 7); // Cap at weekly
}

// ============================================================================
// High-level wrapper with Input/Dependencies pattern
// ============================================================================

/**
 * Input for release planning analysis
 */
export interface ReleasePlanningInput {
  /** Project ID */
  projectId: string;
  /** Root structure (book or arc) */
  rootStructure: Structure;
  /** Release schedule configuration */
  releaseSchedule: {
    minimumBuffer: number;
    releaseInterval: number;
  };
}

/**
 * Dependencies for release planning
 */
export interface ReleasePlanningDependencies {
  /** Content repository for getting content status */
  contentRepository: ContentRepository;
}

/**
 * Analyze release planning with Input/Dependencies pattern
 *
 * This is the high-level wrapper function that:
 * 1. Gets all content for chapters from the repository
 * 2. Builds the content map
 * 3. Calls the core analysis function
 *
 * @param input - Release planning input
 * @param deps - Dependencies (repositories)
 * @returns Complete release planning result
 */
export function analyzeReleasePlanningWithDeps(
  input: ReleasePlanningInput,
  deps: ReleasePlanningDependencies
): ReleasePlanningResult {
  // Build content map for all chapters
  const contentMap = new Map<string, Content>();
  const chapters = extractChaptersInOrder(input.rootStructure);

  for (const chapter of chapters) {
    const content = deps.contentRepository.findByStructure(input.projectId, chapter.id);
    if (content) {
      contentMap.set(chapter.id, content);
    }
  }

  // Build serial settings from input
  const serialSettings: SerialSettings = {
    cycleLength: 5,
    cycleTensionTargets: [40, 60, 70, 80, 50],
    minimumBuffer: input.releaseSchedule.minimumBuffer,
    releaseInterval: input.releaseSchedule.releaseInterval,
    enforceHookVariety: true,
    maxConsecutiveSameHook: 2,
  };

  // Call the core analysis function
  return analyzeReleasePlanning(input.rootStructure, serialSettings, contentMap);
}
