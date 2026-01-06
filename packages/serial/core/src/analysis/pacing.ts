/**
 * Pacing assessment service
 *
 * Provides utilities for:
 * - Analyzing pacing across content
 * - Detecting pacing issues and imbalances
 * - Generating pacing recommendations
 * - Tracking pacing patterns and trends
 *
 * Phase 2.2 implementation - analysis/pacing.ts
 */

import type {
  Content,
  ContentAnalysis,
  Structure,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';
import type { PacingSegment } from './types';

/**
 * Input for pacing analysis operations
 */
export interface PacingAnalysisInput {
  /** Project ID */
  projectId: string;
  /** Root structure to analyze */
  rootStructure: Structure;
}

/**
 * Dependencies for pacing analysis
 */
export interface PacingAnalysisDependencies {
  /** Analysis repository for stored results */
  analysisRepository: AnalysisRepository;
  /** Content repository for content lookup */
  contentRepository: ContentRepository;
}

/**
 * Configuration for pacing analysis
 */
export interface PacingConfig {
  /** Minimum acceptable pacing score (0-100) */
  lowPacingThreshold?: number;
  /** Target balance ratio for pacing types (action:dialogue:description) */
  idealActionRatio?: number;
  /** Maximum consecutive chapters of same pacing profile */
  maxConsecutiveSamePacing?: number;
  /** Minimum number of chapters for trend analysis */
  minChaptersForTrend?: number;
}

/**
 * Default pacing configuration
 */
export const DEFAULT_PACING_CONFIG: Required<PacingConfig> = {
  lowPacingThreshold: 40,
  idealActionRatio: 0.3,
  maxConsecutiveSamePacing: 4,
  minChaptersForTrend: 3,
};

/**
 * Pacing profile types
 */
export type PacingProfile = 'fast' | 'moderate' | 'slow' | 'varied';

/**
 * Segment types in content
 */
export type SegmentType = 'action' | 'dialogue' | 'description' | 'introspection' | 'transition';

/**
 * Severity levels for pacing warnings
 */
export type PacingWarningSeverity = 'critical' | 'warning' | 'info';

/**
 * A pacing warning or issue
 */
export interface PacingWarning {
  /** Type of warning */
  type:
    | 'too-slow'
    | 'too-fast'
    | 'monotonous'
    | 'imbalanced'
    | 'consecutive-same'
    | 'missing-analysis';
  /** Severity of the warning */
  severity: PacingWarningSeverity;
  /** Warning message */
  message: string;
  /** Affected structure IDs */
  affectedStructures: string[];
  /** Suggested action */
  suggestion?: string;
}

/**
 * Pacing data for a single chapter
 */
export interface ChapterPacingData {
  /** Structure ID */
  structureId: string;
  /** Chapter title */
  title: string;
  /** Chapter position (1-indexed) */
  position: number;
  /** Pacing score (0-100) */
  pacingScore?: number;
  /** Overall pacing profile */
  profile?: PacingProfile;
  /** Segment breakdown */
  segments: PacingSegment[];
  /** Word count */
  wordCount?: number;
  /** Reading time in minutes */
  readingTime?: number;
  /** Whether content exists */
  hasContent: boolean;
  /** Whether pacing analysis exists */
  hasAnalysis: boolean;
  /** Content ID if exists */
  contentId?: string;
}

/**
 * Pacing segment distribution
 */
export interface PacingSegmentDistribution {
  /** Total segments analyzed */
  totalSegments: number;
  /** Count per segment type */
  distribution: Record<SegmentType, number>;
  /** Percentage per segment type */
  percentages: Record<SegmentType, number>;
  /** Dominant segment type */
  dominant: SegmentType;
  /** Under-represented types */
  underRepresented: SegmentType[];
}

/**
 * Pacing profile distribution across chapters
 */
export interface PacingProfileDistribution {
  /** Total chapters analyzed */
  total: number;
  /** Count per profile */
  distribution: Record<PacingProfile, number>;
  /** Most common profile */
  mostCommon: PacingProfile;
  /** Profiles not used */
  unused: PacingProfile[];
}

/**
 * Pacing trend information
 */
export interface PacingTrend {
  /** Average pacing score */
  average: number;
  /** Minimum score */
  min: number;
  /** Maximum score */
  max: number;
  /** Trend direction */
  direction: 'speeding-up' | 'slowing-down' | 'stable' | 'varied';
  /** Trend slope */
  slope: number;
}

/**
 * Consecutive pacing pattern
 */
export interface ConsecutivePacingPattern {
  /** The repeated profile */
  profile: PacingProfile;
  /** Starting position */
  startPosition: number;
  /** Ending position */
  endPosition: number;
  /** Number of consecutive chapters */
  count: number;
  /** Affected structure IDs */
  structureIds: string[];
}

/**
 * A recommendation for improving pacing
 */
export interface PacingRecommendation {
  /** Recommendation type */
  type: 'vary' | 'speed-up' | 'slow-down' | 'balance' | 'analyze';
  /** Priority (1 = highest) */
  priority: number;
  /** Recommendation message */
  message: string;
  /** Affected structures */
  affectedStructures: string[];
  /** Suggested actions */
  actions: string[];
}

/**
 * Summary of pacing analysis for a structure
 */
export interface PacingSummary {
  /** Structure being analyzed */
  structureId: string;
  /** Structure title */
  title: string;
  /** Average pacing score */
  averageScore: number;
  /** Number of chapters analyzed */
  chaptersAnalyzed: number;
  /** Total chapters */
  totalChapters: number;
  /** Total word count */
  totalWordCount: number;
  /** Total reading time */
  totalReadingTime: number;
  /** Profile distribution */
  profileDistribution: PacingProfileDistribution;
  /** Segment distribution */
  segmentDistribution: PacingSegmentDistribution;
  /** Pacing trend */
  trend: PacingTrend;
  /** Consecutive patterns detected */
  consecutivePatterns: ConsecutivePacingPattern[];
  /** Active warnings */
  warnings: PacingWarning[];
}

/**
 * Result of comprehensive pacing analysis
 */
export interface PacingAnalysisReport {
  /** Summary for the root structure */
  summary: PacingSummary;
  /** Per-chapter data */
  chapterData: ChapterPacingData[];
  /** All warnings across structure */
  warnings: PacingWarning[];
  /** Recommendations for improvement */
  recommendations: PacingRecommendation[];
  /** When the report was generated */
  generatedAt: string;
}

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Collect all chapters from a structure tree in reading order
 */
export function collectChapters(rootStructure: Structure): Structure[] {
  const chapters: Structure[] = [];

  function traverse(node: Structure): void {
    if (node.type === 'chapter') {
      chapters.push(node);
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
 * Determine pacing profile from segments
 */
export function determineProfile(segments: PacingSegment[]): PacingProfile {
  if (segments.length === 0) return 'moderate';

  const speedCounts = { fast: 0, moderate: 0, slow: 0 };

  for (const segment of segments) {
    const weight = segment.endPosition - segment.startPosition;
    speedCounts[segment.speed] += weight;
  }

  const total = speedCounts.fast + speedCounts.moderate + speedCounts.slow;
  if (total === 0) return 'moderate';

  const fastRatio = speedCounts.fast / total;
  const slowRatio = speedCounts.slow / total;

  // Check for varied pacing
  if (speedCounts.fast > 0 && speedCounts.slow > 0 && speedCounts.moderate > 0) {
    const maxRatio = Math.max(fastRatio, slowRatio, speedCounts.moderate / total);
    if (maxRatio < 0.5) return 'varied';
  }

  if (fastRatio > 0.5) return 'fast';
  if (slowRatio > 0.5) return 'slow';
  return 'moderate';
}

/**
 * Get content and analysis for a chapter
 */
function getChapterData(
  projectId: string,
  chapter: Structure,
  deps: PacingAnalysisDependencies
): { content?: Content; analysis?: ContentAnalysis } {
  const content = deps.contentRepository.findByStructure(projectId, chapter.id);
  let analysis: ContentAnalysis | undefined;

  if (content) {
    analysis = deps.analysisRepository.findLatest(projectId, content.id);
  }

  return { content, analysis };
}

/**
 * Build chapter pacing data for a single chapter
 */
function buildChapterData(
  chapter: Structure,
  position: number,
  data: { content?: Content; analysis?: ContentAnalysis }
): ChapterPacingData {
  // PacingAnalysisResult isn't stored directly in ContentAnalysis
  // We have paceScore but not the detailed segments
  // For now, we'll work with what's available
  const pacingScore = data.analysis?.paceScore?.score;
  const segments: PacingSegment[] = [];

  // Determine profile from score if we don't have segments
  let profile: PacingProfile | undefined;
  if (pacingScore !== undefined) {
    if (pacingScore > 70) profile = 'fast';
    else if (pacingScore < 40) profile = 'slow';
    else profile = 'moderate';
  }

  return {
    structureId: chapter.id,
    title: chapter.title,
    position,
    pacingScore,
    profile,
    segments,
    wordCount: data.analysis?.wordCount,
    readingTime: data.analysis?.readingTime,
    hasContent: data.content !== undefined,
    hasAnalysis: data.analysis?.paceScore !== undefined,
    contentId: data.content?.id,
  };
}

/**
 * Calculate profile distribution from chapter data
 */
export function calculateProfileDistribution(
  chapterData: ChapterPacingData[]
): PacingProfileDistribution {
  const analyzed = chapterData.filter((c) => c.profile !== undefined);

  const distribution: Record<PacingProfile, number> = {
    fast: 0,
    moderate: 0,
    slow: 0,
    varied: 0,
  };

  for (const chapter of analyzed) {
    if (chapter.profile) {
      distribution[chapter.profile]++;
    }
  }

  let mostCommon: PacingProfile = 'moderate';
  let maxCount = 0;
  for (const [profile, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = profile as PacingProfile;
    }
  }

  const allProfiles: PacingProfile[] = ['fast', 'moderate', 'slow', 'varied'];
  const unused = allProfiles.filter((p) => distribution[p] === 0);

  return {
    total: analyzed.length,
    distribution,
    mostCommon,
    unused,
  };
}

/**
 * Calculate segment distribution from chapter data
 */
export function calculateSegmentDistribution(
  chapterData: ChapterPacingData[]
): PacingSegmentDistribution {
  const allSegments = chapterData.flatMap((c) => c.segments);

  const distribution: Record<SegmentType, number> = {
    action: 0,
    dialogue: 0,
    description: 0,
    introspection: 0,
    transition: 0,
  };

  for (const segment of allSegments) {
    const weight = segment.endPosition - segment.startPosition;
    distribution[segment.type] += weight;
  }

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  const percentages: Record<SegmentType, number> = {
    action: 0,
    dialogue: 0,
    description: 0,
    introspection: 0,
    transition: 0,
  };

  if (total > 0) {
    for (const [type, count] of Object.entries(distribution)) {
      percentages[type as SegmentType] = (count / total) * 100;
    }
  }

  let dominant: SegmentType = 'dialogue';
  let maxCount = 0;
  for (const [type, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = type as SegmentType;
    }
  }

  const allTypes: SegmentType[] = ['action', 'dialogue', 'description', 'introspection', 'transition'];
  const underRepresented = allTypes.filter((t) => percentages[t] < 10 && distribution[t] > 0);

  return {
    totalSegments: allSegments.length,
    distribution,
    percentages,
    dominant,
    underRepresented,
  };
}

/**
 * Calculate pacing trend from chapter data
 */
export function calculatePacingTrend(chapterData: ChapterPacingData[]): PacingTrend {
  const scores = chapterData
    .filter((c) => c.pacingScore !== undefined)
    .map((c) => c.pacingScore!);

  if (scores.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      direction: 'stable',
      slope: 0,
    };
  }

  const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  // Calculate slope
  let slope = 0;
  if (scores.length >= 2) {
    const n = scores.length;
    const xMean = (n - 1) / 2;
    const yMean = average;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    slope = denominator !== 0 ? numerator / denominator : 0;
  }

  // Determine direction
  let direction: PacingTrend['direction'];
  const slopeThreshold = 1;
  const variationThreshold = 20;
  const range = max - min;

  // Calculate R² (coefficient of determination) to measure trend linearity
  let rSquared = 0;
  if (scores.length >= 2) {
    const n = scores.length;
    const ssRes = scores.reduce((sum, y, i) => {
      const predicted = average + slope * (i - (n - 1) / 2);
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = scores.reduce((sum, y) => sum + Math.pow(y - average, 2), 0);
    rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  }

  // If there's a strong linear trend (high R²), prioritize slope over range
  const hasStrongTrend = rSquared > 0.7 && Math.abs(slope) > slopeThreshold;

  if (hasStrongTrend) {
    // Clear linear trend overrides high variation
    direction = slope > 0 ? 'speeding-up' : 'slowing-down';
  } else if (range > variationThreshold) {
    direction = 'varied';
  } else if (slope > slopeThreshold) {
    direction = 'speeding-up';
  } else if (slope < -slopeThreshold) {
    direction = 'slowing-down';
  } else {
    direction = 'stable';
  }

  return {
    average,
    min,
    max,
    direction,
    slope,
  };
}

/**
 * Detect consecutive pacing patterns
 */
export function detectConsecutivePatterns(
  chapterData: ChapterPacingData[],
  threshold: number
): ConsecutivePacingPattern[] {
  const patterns: ConsecutivePacingPattern[] = [];
  const analyzed = chapterData.filter((c) => c.profile !== undefined);

  if (analyzed.length < threshold) return [];

  let currentProfile: PacingProfile | undefined;
  let startPos = 0;
  let count = 0;
  let structureIds: string[] = [];

  for (let i = 0; i < analyzed.length; i++) {
    const chapter = analyzed[i];

    if (chapter.profile === currentProfile) {
      count++;
      structureIds.push(chapter.structureId);
    } else {
      if (count >= threshold && currentProfile) {
        patterns.push({
          profile: currentProfile,
          startPosition: startPos,
          endPosition: analyzed[i - 1].position,
          count,
          structureIds: [...structureIds],
        });
      }

      currentProfile = chapter.profile;
      startPos = chapter.position;
      count = 1;
      structureIds = [chapter.structureId];
    }
  }

  // Check final streak
  if (count >= threshold && currentProfile) {
    patterns.push({
      profile: currentProfile,
      startPosition: startPos,
      endPosition: analyzed[analyzed.length - 1].position,
      count,
      structureIds: [...structureIds],
    });
  }

  return patterns;
}

/**
 * Generate pacing warnings from chapter data
 */
export function generatePacingWarnings(
  chapterData: ChapterPacingData[],
  profileDist: PacingProfileDistribution,
  segmentDist: PacingSegmentDistribution,
  consecutivePatterns: ConsecutivePacingPattern[],
  config: Required<PacingConfig>
): PacingWarning[] {
  const warnings: PacingWarning[] = [];

  // Too slow pacing
  const slowChapters = chapterData.filter(
    (c) => c.pacingScore !== undefined && c.pacingScore < config.lowPacingThreshold
  );
  if (slowChapters.length > 0) {
    warnings.push({
      type: 'too-slow',
      severity: slowChapters.length > 2 ? 'warning' : 'info',
      message: `${slowChapters.length} chapter(s) have slow pacing (score < ${config.lowPacingThreshold})`,
      affectedStructures: slowChapters.map((c) => c.structureId),
      suggestion: 'Consider adding more action or dialogue to increase pace',
    });
  }

  // Too fast pacing (might be overwhelming)
  const fastChapters = chapterData.filter(
    (c) => c.pacingScore !== undefined && c.pacingScore > 85
  );
  if (fastChapters.length > chapterData.length * 0.4) {
    warnings.push({
      type: 'too-fast',
      severity: 'info',
      message: `${fastChapters.length} chapter(s) have very fast pacing, which may tire readers`,
      affectedStructures: fastChapters.map((c) => c.structureId),
      suggestion: 'Consider adding reflection or description for breathing room',
    });
  }

  // Monotonous pacing (too uniform)
  const analyzed = chapterData.filter((c) => c.profile !== undefined);
  if (profileDist.mostCommon && profileDist.distribution[profileDist.mostCommon] > analyzed.length * 0.7) {
    warnings.push({
      type: 'monotonous',
      severity: 'warning',
      message: `Pacing is predominantly "${profileDist.mostCommon}" (${Math.round((profileDist.distribution[profileDist.mostCommon] / profileDist.total) * 100)}%)`,
      affectedStructures: [],
      suggestion: 'Vary the pacing to create a more dynamic reading experience',
    });
  }

  // Imbalanced segments
  if (segmentDist.totalSegments > 0) {
    const dominantPct = segmentDist.percentages[segmentDist.dominant];
    if (dominantPct > 60) {
      warnings.push({
        type: 'imbalanced',
        severity: 'info',
        message: `Content is heavily ${segmentDist.dominant}-focused (${Math.round(dominantPct)}%)`,
        affectedStructures: [],
        suggestion: `Consider adding more ${segmentDist.underRepresented.join(', ') || 'variety'}`,
      });
    }
  }

  // Consecutive same pacing
  for (const pattern of consecutivePatterns) {
    warnings.push({
      type: 'consecutive-same',
      severity: pattern.count >= 5 ? 'warning' : 'info',
      message: `${pattern.count} consecutive "${pattern.profile}" paced chapters (${pattern.startPosition}-${pattern.endPosition})`,
      affectedStructures: pattern.structureIds,
      suggestion: 'Vary pacing to maintain reader engagement',
    });
  }

  // Missing analysis
  const missingAnalysis = chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
  if (missingAnalysis.length > 0) {
    warnings.push({
      type: 'missing-analysis',
      severity: 'info',
      message: `${missingAnalysis.length} chapter(s) need pacing analysis`,
      affectedStructures: missingAnalysis.map((c) => c.structureId),
      suggestion: 'Run analysis on these chapters to track pacing',
    });
  }

  return warnings;
}

/**
 * Generate recommendations based on analysis
 */
export function generatePacingRecommendations(
  _chapterData: ChapterPacingData[],
  warnings: PacingWarning[],
  _profileDist: PacingProfileDistribution,
  _trend: PacingTrend
): PacingRecommendation[] {
  const recommendations: PacingRecommendation[] = [];

  // Recommendation for monotonous pacing
  const monotonousWarning = warnings.find((w) => w.type === 'monotonous');
  if (monotonousWarning) {
    recommendations.push({
      type: 'vary',
      priority: 1,
      message: 'Vary pacing across chapters',
      affectedStructures: [],
      actions: [
        'Alternate between fast and slow chapters',
        'Use arc structure to plan pacing flow',
        'Match pacing to story beats (action climaxes, quiet resolutions)',
      ],
    });
  }

  // Recommendation for slow pacing
  const slowWarning = warnings.find((w) => w.type === 'too-slow');
  if (slowWarning && slowWarning.severity === 'warning') {
    recommendations.push({
      type: 'speed-up',
      priority: 2,
      message: 'Increase pacing in slow chapters',
      affectedStructures: slowWarning.affectedStructures,
      actions: [
        'Add more action sequences',
        'Increase dialogue exchanges',
        'Cut excessive description',
        'Shorten sentences and paragraphs',
      ],
    });
  }

  // Recommendation for fast pacing
  const fastWarning = warnings.find((w) => w.type === 'too-fast');
  if (fastWarning) {
    recommendations.push({
      type: 'slow-down',
      priority: 2,
      message: 'Add breathing room in fast-paced sections',
      affectedStructures: fastWarning.affectedStructures,
      actions: [
        'Add character introspection',
        'Include descriptive passages',
        'Allow moments of quiet after action',
      ],
    });
  }

  // Recommendation for imbalance
  const imbalanceWarning = warnings.find((w) => w.type === 'imbalanced');
  if (imbalanceWarning) {
    recommendations.push({
      type: 'balance',
      priority: 3,
      message: 'Balance content types',
      affectedStructures: [],
      actions: [
        'Review segment distribution',
        'Ensure variety in each chapter',
        'Plan content types during outlining',
      ],
    });
  }

  // Recommendation for missing analysis
  const analysisWarning = warnings.find((w) => w.type === 'missing-analysis');
  if (analysisWarning) {
    recommendations.push({
      type: 'analyze',
      priority: 4,
      message: 'Complete pacing analysis for all chapters',
      affectedStructures: analysisWarning.affectedStructures,
      actions: ['Run analysis on chapters without pacing data'],
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Generate comprehensive pacing analysis report
 *
 * Analyzes pacing across an entire structure tree, producing
 * warnings, trends, and recommendations.
 */
export function analyzePacing(
  input: PacingAnalysisInput,
  deps: PacingAnalysisDependencies,
  config?: PacingConfig
): PacingAnalysisReport {
  const mergedConfig = { ...DEFAULT_PACING_CONFIG, ...config };

  // Collect all chapters
  const chapters = collectChapters(input.rootStructure);

  // Build chapter data
  const chapterData: ChapterPacingData[] = chapters.map((chapter, index) => {
    const data = getChapterData(input.projectId, chapter, deps);
    return buildChapterData(chapter, index + 1, data);
  });

  // Calculate distributions
  const profileDistribution = calculateProfileDistribution(chapterData);
  const segmentDistribution = calculateSegmentDistribution(chapterData);

  // Calculate trend
  const trend = calculatePacingTrend(chapterData);

  // Detect consecutive patterns
  const consecutivePatterns = detectConsecutivePatterns(
    chapterData,
    mergedConfig.maxConsecutiveSamePacing
  );

  // Generate warnings
  const warnings = generatePacingWarnings(
    chapterData,
    profileDistribution,
    segmentDistribution,
    consecutivePatterns,
    mergedConfig
  );

  // Generate recommendations
  const recommendations = generatePacingRecommendations(
    chapterData,
    warnings,
    profileDistribution,
    trend
  );

  // Calculate totals
  const analyzedChapters = chapterData.filter((c) => c.hasAnalysis);
  const totalWordCount = chapterData.reduce((sum, c) => sum + (c.wordCount || 0), 0);
  const totalReadingTime = chapterData.reduce((sum, c) => sum + (c.readingTime || 0), 0);

  const summary: PacingSummary = {
    structureId: input.rootStructure.id,
    title: input.rootStructure.title,
    averageScore: trend.average,
    chaptersAnalyzed: analyzedChapters.length,
    totalChapters: chapterData.length,
    totalWordCount,
    totalReadingTime,
    profileDistribution,
    segmentDistribution,
    trend,
    consecutivePatterns,
    warnings,
  };

  return {
    summary,
    chapterData,
    warnings,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Analyze pacing with explicit dependency injection
 */
export function analyzePacingWithDeps(
  input: PacingAnalysisInput,
  deps: PacingAnalysisDependencies,
  config?: PacingConfig
): PacingAnalysisReport {
  return analyzePacing(input, deps, config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get chapters with slow pacing
 */
export function getSlowPacedChapters(
  report: PacingAnalysisReport,
  threshold: number = DEFAULT_PACING_CONFIG.lowPacingThreshold
): ChapterPacingData[] {
  return report.chapterData.filter(
    (c) => c.pacingScore !== undefined && c.pacingScore < threshold
  );
}

/**
 * Get chapters with fast pacing
 */
export function getFastPacedChapters(
  report: PacingAnalysisReport,
  threshold: number = 80
): ChapterPacingData[] {
  return report.chapterData.filter(
    (c) => c.pacingScore !== undefined && c.pacingScore > threshold
  );
}

/**
 * Get chapters by pacing profile
 */
export function getChaptersByProfile(
  report: PacingAnalysisReport,
  profile: PacingProfile
): ChapterPacingData[] {
  return report.chapterData.filter((c) => c.profile === profile);
}

/**
 * Get chapters missing pacing analysis
 */
export function getUnanalyzedChapters(report: PacingAnalysisReport): ChapterPacingData[] {
  return report.chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
}

/**
 * Check if pacing needs attention
 */
export function pacingNeedsAttention(report: PacingAnalysisReport): boolean {
  return report.warnings.some((w) => w.severity === 'critical' || w.severity === 'warning');
}

/**
 * Get analysis completion percentage
 */
export function getPacingAnalysisCompletion(report: PacingAnalysisReport): number {
  const withContent = report.chapterData.filter((c) => c.hasContent);
  if (withContent.length === 0) return 0;
  const analyzed = withContent.filter((c) => c.hasAnalysis);
  return (analyzed.length / withContent.length) * 100;
}

/**
 * Get profile summary
 */
export function getProfileSummary(
  report: PacingAnalysisReport
): Array<{ profile: PacingProfile; count: number; percentage: number }> {
  const profiles: PacingProfile[] = ['fast', 'moderate', 'slow', 'varied'];

  return profiles.map((profile) => ({
    profile,
    count: report.summary.profileDistribution.distribution[profile],
    percentage:
      report.summary.profileDistribution.total > 0
        ? (report.summary.profileDistribution.distribution[profile] /
            report.summary.profileDistribution.total) *
          100
        : 0,
  }));
}

/**
 * Get average words per minute (reading pace indicator)
 */
export function getAverageWordsPerMinute(report: PacingAnalysisReport): number {
  if (report.summary.totalReadingTime === 0) return 0;
  return report.summary.totalWordCount / report.summary.totalReadingTime;
}

/**
 * Estimate total reading time for entire work
 */
export function estimateTotalReadingTime(report: PacingAnalysisReport): {
  minutes: number;
  hours: number;
  formatted: string;
} {
  const minutes = report.summary.totalReadingTime;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  let formatted: string;
  if (hours > 0) {
    formatted = `${hours}h ${remainingMinutes}m`;
  } else {
    formatted = `${remainingMinutes}m`;
  }

  return { minutes, hours, formatted };
}
