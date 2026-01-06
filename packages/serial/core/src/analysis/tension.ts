/**
 * Tension scoring and analysis
 *
 * Provides utilities for:
 * - Scoring tension levels in content
 * - Detecting tension issues and imbalances
 * - Generating tension recommendations
 * - Aggregating tension data across structure
 *
 * Phase 2.2 implementation - analysis/tension.ts
 */

import type {
  Content,
  ContentAnalysis,
  Structure,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';
import type { TensionMoment } from './types';

/**
 * Input for tension analysis operations
 */
export interface TensionAnalysisInput {
  /** Project ID */
  projectId: string;
  /** Root structure to analyze */
  rootStructure: Structure;
}

/**
 * Dependencies for tension analysis
 */
export interface TensionAnalysisDependencies {
  /** Analysis repository for stored results */
  analysisRepository: AnalysisRepository;
  /** Content repository for content lookup */
  contentRepository: ContentRepository;
}

/**
 * Configuration for tension analysis
 */
export interface TensionConfig {
  /** Threshold for low tension warning (0-100) */
  lowTensionThreshold?: number;
  /** Threshold for high tension warning (0-100) */
  highTensionThreshold?: number;
  /** Acceptable divergence from target (percentage points) */
  acceptableDivergence?: number;
  /** Minimum chapters for trend calculation */
  minChaptersForTrend?: number;
}

/**
 * Default tension configuration
 */
export const DEFAULT_TENSION_CONFIG: Required<TensionConfig> = {
  lowTensionThreshold: 30,
  highTensionThreshold: 85,
  acceptableDivergence: 15,
  minChaptersForTrend: 3,
};

/**
 * Severity levels for tension warnings
 */
export type TensionWarningSeverity = 'critical' | 'warning' | 'info';

/**
 * A tension warning or issue
 */
export interface TensionWarning {
  /** Type of warning */
  type:
    | 'too-low'
    | 'too-high'
    | 'divergence'
    | 'flat-line'
    | 'declining-trend'
    | 'missing-target'
    | 'missing-analysis';
  /** Severity of the warning */
  severity: TensionWarningSeverity;
  /** Warning message */
  message: string;
  /** Affected structure IDs */
  affectedStructures: string[];
  /** Suggested action */
  suggestion?: string;
}

/**
 * Tension trend information
 */
export interface TensionTrend {
  /** Trend direction */
  direction: 'rising' | 'falling' | 'stable' | 'varied';
  /** Trend slope (positive = rising) */
  slope: number;
  /** Average tension across analyzed chapters */
  average: number;
  /** Minimum tension */
  min: number;
  /** Maximum tension */
  max: number;
  /** Standard deviation */
  standardDeviation: number;
}

/**
 * Summary of tension analysis for a structure
 */
export interface TensionSummary {
  /** Structure being analyzed */
  structureId: string;
  /** Structure title */
  title: string;
  /** Overall average tension */
  averageTension: number;
  /** Planned average tension (from targets) */
  plannedAverageTension?: number;
  /** Overall divergence (actual - planned) */
  overallDivergence?: number;
  /** Number of chapters analyzed */
  chaptersAnalyzed: number;
  /** Number of chapters with content */
  chaptersWithContent: number;
  /** Total chapters */
  totalChapters: number;
  /** Trend information */
  trend: TensionTrend;
  /** Active warnings */
  warnings: TensionWarning[];
  /** Tension moments from analysis */
  significantMoments: TensionMoment[];
}

/**
 * Result of comprehensive tension analysis
 */
export interface TensionAnalysisReport {
  /** Summary for the root structure */
  summary: TensionSummary;
  /** Per-chapter data */
  chapterData: ChapterTensionData[];
  /** All warnings across structure */
  warnings: TensionWarning[];
  /** Recommendations for improvement */
  recommendations: TensionRecommendation[];
  /** When the report was generated */
  generatedAt: string;
}

/**
 * Tension data for a single chapter
 */
export interface ChapterTensionData {
  /** Structure ID */
  structureId: string;
  /** Chapter title */
  title: string;
  /** Chapter position (1-indexed) */
  position: number;
  /** Planned tension target */
  plannedTension?: number;
  /** Actual tension from analysis */
  actualTension?: number;
  /** Divergence (actual - planned) */
  divergence?: number;
  /** Whether content exists */
  hasContent: boolean;
  /** Whether analysis exists */
  hasAnalysis: boolean;
  /** Content ID if exists */
  contentId?: string;
  /** Tension moments in this chapter */
  moments: TensionMoment[];
}

/**
 * A recommendation for improving tension
 */
export interface TensionRecommendation {
  /** Recommendation type */
  type: 'increase' | 'decrease' | 'vary' | 'target' | 'analyze';
  /** Priority (1 = highest) */
  priority: number;
  /** Recommendation message */
  message: string;
  /** Affected structures */
  affectedStructures: string[];
  /** Suggested actions */
  actions: string[];
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
    // Sort children by order before traversing
    const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
    for (const child of sortedChildren) {
      traverse(child);
    }
  }

  traverse(rootStructure);
  return chapters;
}

/**
 * Get content and analysis for a chapter
 */
function getChapterData(
  projectId: string,
  chapter: Structure,
  deps: TensionAnalysisDependencies
): { content?: Content; analysis?: ContentAnalysis } {
  const content = deps.contentRepository.findByStructure(projectId, chapter.id);
  let analysis: ContentAnalysis | undefined;

  if (content) {
    analysis = deps.analysisRepository.findLatest(projectId, content.id);
  }

  return { content, analysis };
}

/**
 * Build chapter tension data for a single chapter
 */
function buildChapterData(
  chapter: Structure,
  position: number,
  data: { content?: Content; analysis?: ContentAnalysis }
): ChapterTensionData {
  const actualTension = data.analysis?.tensionScore?.score;
  const plannedTension = chapter.tensionTarget;
  let divergence: number | undefined;

  if (actualTension !== undefined && plannedTension !== undefined) {
    divergence = actualTension - plannedTension;
  }

  // Extract tension moments if available
  // Note: TensionMoments are not stored in ContentAnalysis directly,
  // so we create an empty array. These would need to be stored separately
  // or re-analyzed to include.
  const moments: TensionMoment[] = [];

  return {
    structureId: chapter.id,
    title: chapter.title,
    position,
    plannedTension,
    actualTension,
    divergence,
    hasContent: data.content !== undefined,
    hasAnalysis: data.analysis !== undefined,
    contentId: data.content?.id,
    moments,
  };
}

/**
 * Calculate tension trend from chapter data
 */
export function calculateTensionTrend(chapterData: ChapterTensionData[]): TensionTrend {
  const tensions = chapterData
    .filter((c) => c.actualTension !== undefined)
    .map((c) => c.actualTension!);

  if (tensions.length === 0) {
    return {
      direction: 'stable',
      slope: 0,
      average: 0,
      min: 0,
      max: 0,
      standardDeviation: 0,
    };
  }

  const average = tensions.reduce((sum, t) => sum + t, 0) / tensions.length;
  const min = Math.min(...tensions);
  const max = Math.max(...tensions);

  // Calculate standard deviation
  const squaredDiffs = tensions.map((t) => Math.pow(t - average, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, d) => sum + d, 0) / tensions.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);

  // Calculate slope using simple linear regression
  let slope = 0;
  if (tensions.length >= 2) {
    const n = tensions.length;
    const xMean = (n - 1) / 2;
    const yMean = average;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (tensions[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    slope = denominator !== 0 ? numerator / denominator : 0;
  }

  // Determine direction
  let direction: TensionTrend['direction'];
  const slopeThreshold = 1; // Minimum slope to consider a trend
  const variationThreshold = 15; // If std dev is high, it's varied

  // Calculate R² (coefficient of determination) to measure trend linearity
  // R² near 1 means a clear linear trend despite high std dev
  let rSquared = 0;
  if (tensions.length >= 2) {
    const n = tensions.length;
    const ssRes = tensions.reduce((sum, y, i) => {
      const predicted = average + slope * (i - (n - 1) / 2);
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = tensions.reduce((sum, y) => sum + Math.pow(y - average, 2), 0);
    rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 1;
  }

  // If there's a strong linear trend (high R²), prioritize slope over std dev
  // Otherwise, high variation indicates varied/inconsistent tension
  const hasStrongTrend = rSquared > 0.7 && Math.abs(slope) > slopeThreshold;

  if (hasStrongTrend) {
    // Clear linear trend overrides high variation
    direction = slope > 0 ? 'rising' : 'falling';
  } else if (standardDeviation > variationThreshold) {
    direction = 'varied';
  } else if (slope > slopeThreshold) {
    direction = 'rising';
  } else if (slope < -slopeThreshold) {
    direction = 'falling';
  } else {
    direction = 'stable';
  }

  return {
    direction,
    slope,
    average,
    min,
    max,
    standardDeviation,
  };
}

/**
 * Generate tension warnings from chapter data
 */
export function generateTensionWarnings(
  chapterData: ChapterTensionData[],
  config: Required<TensionConfig>
): TensionWarning[] {
  const warnings: TensionWarning[] = [];

  // Check for low tension chapters
  const lowTensionChapters = chapterData.filter(
    (c) => c.actualTension !== undefined && c.actualTension < config.lowTensionThreshold
  );
  if (lowTensionChapters.length > 0) {
    warnings.push({
      type: 'too-low',
      severity: lowTensionChapters.length > 2 ? 'warning' : 'info',
      message: `${lowTensionChapters.length} chapter(s) have tension below ${config.lowTensionThreshold}`,
      affectedStructures: lowTensionChapters.map((c) => c.structureId),
      suggestion: 'Consider adding conflict, raising stakes, or increasing urgency',
    });
  }

  // Check for high tension chapters
  const highTensionChapters = chapterData.filter(
    (c) => c.actualTension !== undefined && c.actualTension > config.highTensionThreshold
  );
  if (highTensionChapters.length > chapterData.length * 0.3) {
    // More than 30% high tension
    warnings.push({
      type: 'too-high',
      severity: 'warning',
      message: `${highTensionChapters.length} chapter(s) have very high tension (>${config.highTensionThreshold}), which may cause reader fatigue`,
      affectedStructures: highTensionChapters.map((c) => c.structureId),
      suggestion: 'Consider adding breather moments or quieter scenes',
    });
  }

  // Check for divergence from targets
  const divergentChapters = chapterData.filter(
    (c) => c.divergence !== undefined && Math.abs(c.divergence) > config.acceptableDivergence
  );
  if (divergentChapters.length > 0) {
    warnings.push({
      type: 'divergence',
      severity: divergentChapters.length > 3 ? 'warning' : 'info',
      message: `${divergentChapters.length} chapter(s) diverge significantly from their tension targets`,
      affectedStructures: divergentChapters.map((c) => c.structureId),
      suggestion: 'Review content to align with intended tension levels, or adjust targets',
    });
  }

  // Check for flat-line (low variation)
  const analyzedChapters = chapterData.filter((c) => c.actualTension !== undefined);
  if (analyzedChapters.length >= config.minChaptersForTrend) {
    const tensions = analyzedChapters.map((c) => c.actualTension!);
    const range = Math.max(...tensions) - Math.min(...tensions);
    if (range < 10) {
      warnings.push({
        type: 'flat-line',
        severity: 'info',
        message: 'Tension levels are very consistent (low variation), which may reduce engagement',
        affectedStructures: analyzedChapters.map((c) => c.structureId),
        suggestion: 'Consider varying tension more to create peaks and valleys',
      });
    }
  }

  // Check for declining trend
  const trend = calculateTensionTrend(chapterData);
  if (trend.direction === 'falling' && trend.slope < -2) {
    warnings.push({
      type: 'declining-trend',
      severity: 'warning',
      message: 'Overall tension is declining, which may indicate loss of momentum',
      affectedStructures: analyzedChapters.map((c) => c.structureId),
      suggestion: 'Consider reintroducing conflict or raising stakes',
    });
  }

  // Check for missing targets
  const missingTargets = chapterData.filter(
    (c) => c.hasContent && c.plannedTension === undefined
  );
  if (missingTargets.length > 0) {
    warnings.push({
      type: 'missing-target',
      severity: 'info',
      message: `${missingTargets.length} chapter(s) have content but no tension targets set`,
      affectedStructures: missingTargets.map((c) => c.structureId),
      suggestion: 'Set tension targets for better planning and tracking',
    });
  }

  // Check for missing analysis
  const missingAnalysis = chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
  if (missingAnalysis.length > 0) {
    warnings.push({
      type: 'missing-analysis',
      severity: 'info',
      message: `${missingAnalysis.length} chapter(s) have content but no tension analysis`,
      affectedStructures: missingAnalysis.map((c) => c.structureId),
      suggestion: 'Run analysis on these chapters to track tension',
    });
  }

  return warnings;
}

/**
 * Generate recommendations based on analysis
 */
export function generateTensionRecommendations(
  _chapterData: ChapterTensionData[],
  warnings: TensionWarning[],
  trend: TensionTrend
): TensionRecommendation[] {
  const recommendations: TensionRecommendation[] = [];

  // Recommendation based on declining trend
  if (trend.direction === 'falling') {
    recommendations.push({
      type: 'increase',
      priority: 1,
      message: 'Tension is declining - consider building toward a climax',
      affectedStructures: [],
      actions: [
        'Introduce new complications or obstacles',
        'Reveal important information or secrets',
        'Increase stakes or add time pressure',
      ],
    });
  }

  // Recommendation for flat tension
  const flatLineWarning = warnings.find((w) => w.type === 'flat-line');
  if (flatLineWarning) {
    recommendations.push({
      type: 'vary',
      priority: 2,
      message: 'Tension is too uniform - add more variety',
      affectedStructures: flatLineWarning.affectedStructures,
      actions: [
        'Plan deliberate peaks and valleys',
        'Alternate high-action and reflective chapters',
        'Use chapter types to guide tension levels',
      ],
    });
  }

  // Recommendation for high tension fatigue
  const highTensionWarning = warnings.find((w) => w.type === 'too-high');
  if (highTensionWarning) {
    recommendations.push({
      type: 'decrease',
      priority: 2,
      message: 'Reader fatigue risk from sustained high tension',
      affectedStructures: highTensionWarning.affectedStructures,
      actions: [
        'Add breather scenes between action sequences',
        'Include character development moments',
        'Use humor or lighter moments for relief',
      ],
    });
  }

  // Recommendation for missing targets
  const missingTargetWarning = warnings.find((w) => w.type === 'missing-target');
  if (missingTargetWarning) {
    recommendations.push({
      type: 'target',
      priority: 3,
      message: 'Set tension targets for better planning',
      affectedStructures: missingTargetWarning.affectedStructures,
      actions: [
        'Define target tension for each chapter',
        'Use arc structure to plan tension flow',
        'Align targets with story beats',
      ],
    });
  }

  // Recommendation for missing analysis
  const missingAnalysisWarning = warnings.find((w) => w.type === 'missing-analysis');
  if (missingAnalysisWarning) {
    recommendations.push({
      type: 'analyze',
      priority: 4,
      message: 'Analyze remaining chapters for complete picture',
      affectedStructures: missingAnalysisWarning.affectedStructures,
      actions: ['Run analysis on unanalyzed content'],
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Generate comprehensive tension analysis report
 *
 * Analyzes tension across an entire structure tree, producing
 * warnings, trends, and recommendations.
 */
export function analyzeTension(
  input: TensionAnalysisInput,
  deps: TensionAnalysisDependencies,
  config?: TensionConfig
): TensionAnalysisReport {
  const mergedConfig = { ...DEFAULT_TENSION_CONFIG, ...config };

  // Collect all chapters
  const chapters = collectChapters(input.rootStructure);

  // Build chapter data
  const chapterData: ChapterTensionData[] = chapters.map((chapter, index) => {
    const data = getChapterData(input.projectId, chapter, deps);
    return buildChapterData(chapter, index + 1, data);
  });

  // Calculate trend
  const trend = calculateTensionTrend(chapterData);

  // Generate warnings
  const warnings = generateTensionWarnings(chapterData, mergedConfig);

  // Generate recommendations
  const recommendations = generateTensionRecommendations(chapterData, warnings, trend);

  // Calculate summary statistics
  const analyzedChapters = chapterData.filter((c) => c.actualTension !== undefined);
  const chaptersWithContent = chapterData.filter((c) => c.hasContent);

  let averageTension = 0;
  if (analyzedChapters.length > 0) {
    averageTension =
      analyzedChapters.reduce((sum, c) => sum + c.actualTension!, 0) / analyzedChapters.length;
  }

  const chaptersWithTargets = chapterData.filter((c) => c.plannedTension !== undefined);
  let plannedAverageTension: number | undefined;
  if (chaptersWithTargets.length > 0) {
    plannedAverageTension =
      chaptersWithTargets.reduce((sum, c) => sum + c.plannedTension!, 0) /
      chaptersWithTargets.length;
  }

  let overallDivergence: number | undefined;
  if (plannedAverageTension !== undefined && analyzedChapters.length > 0) {
    overallDivergence = averageTension - plannedAverageTension;
  }

  // Collect significant tension moments
  const significantMoments = chapterData.flatMap((c) => c.moments);

  const summary: TensionSummary = {
    structureId: input.rootStructure.id,
    title: input.rootStructure.title,
    averageTension,
    plannedAverageTension,
    overallDivergence,
    chaptersAnalyzed: analyzedChapters.length,
    chaptersWithContent: chaptersWithContent.length,
    totalChapters: chapterData.length,
    trend,
    warnings,
    significantMoments,
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
 * Analyze tension with explicit dependency injection
 *
 * Alternative entry point for when dependencies are constructed externally.
 */
export function analyzeTensionWithDeps(
  input: TensionAnalysisInput,
  deps: TensionAnalysisDependencies,
  config?: TensionConfig
): TensionAnalysisReport {
  return analyzeTension(input, deps, config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get chapters with tension below threshold
 */
export function getLowTensionChapters(
  report: TensionAnalysisReport,
  threshold: number = DEFAULT_TENSION_CONFIG.lowTensionThreshold
): ChapterTensionData[] {
  return report.chapterData.filter(
    (c) => c.actualTension !== undefined && c.actualTension < threshold
  );
}

/**
 * Get chapters with tension above threshold
 */
export function getHighTensionChapters(
  report: TensionAnalysisReport,
  threshold: number = DEFAULT_TENSION_CONFIG.highTensionThreshold
): ChapterTensionData[] {
  return report.chapterData.filter(
    (c) => c.actualTension !== undefined && c.actualTension > threshold
  );
}

/**
 * Get chapters with high divergence from target
 */
export function getHighDivergenceChapters(
  report: TensionAnalysisReport,
  threshold: number = DEFAULT_TENSION_CONFIG.acceptableDivergence
): ChapterTensionData[] {
  return report.chapterData.filter(
    (c) => c.divergence !== undefined && Math.abs(c.divergence) > threshold
  );
}

/**
 * Get chapters missing tension analysis
 */
export function getUnanalyzedChapters(report: TensionAnalysisReport): ChapterTensionData[] {
  return report.chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
}

/**
 * Get chapters missing tension targets
 */
export function getChaptersWithoutTargets(report: TensionAnalysisReport): ChapterTensionData[] {
  return report.chapterData.filter((c) => c.plannedTension === undefined);
}

/**
 * Check if tension needs attention (has significant warnings)
 */
export function tensionNeedsAttention(report: TensionAnalysisReport): boolean {
  return report.warnings.some((w) => w.severity === 'critical' || w.severity === 'warning');
}

/**
 * Get critical warnings only
 */
export function getCriticalWarnings(report: TensionAnalysisReport): TensionWarning[] {
  return report.warnings.filter((w) => w.severity === 'critical');
}

/**
 * Calculate completion percentage for tension analysis
 */
export function getAnalysisCompletion(report: TensionAnalysisReport): number {
  if (report.summary.chaptersWithContent === 0) {
    return 0;
  }
  return (report.summary.chaptersAnalyzed / report.summary.chaptersWithContent) * 100;
}
