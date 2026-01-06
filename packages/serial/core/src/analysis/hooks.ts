/**
 * Hook analysis service
 *
 * Provides utilities for:
 * - Analyzing hook strength and effectiveness
 * - Detecting hook pattern issues
 * - Generating hook recommendations
 * - Tracking hook diversity and trends
 *
 * Phase 2.2 implementation - analysis/hooks.ts
 */

import type {
  Content,
  ContentAnalysis,
  HookType,
  Structure,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';
import { HOOK_TYPES } from '../structure/hooks';

/**
 * Input for hook analysis operations
 */
export interface HookAnalysisInput {
  /** Project ID */
  projectId: string;
  /** Root structure to analyze */
  rootStructure: Structure;
}

/**
 * Dependencies for hook analysis
 */
export interface HookAnalysisDependencies {
  /** Analysis repository for stored results */
  analysisRepository: AnalysisRepository;
  /** Content repository for content lookup */
  contentRepository: ContentRepository;
}

/**
 * Configuration for hook analysis
 */
export interface HooksConfig {
  /** Minimum acceptable hook strength (0-100) */
  weakHookThreshold?: number;
  /** Number of consecutive same hooks that triggers warning */
  repetitionThreshold?: number;
  /** Number of recent chapters to analyze for trends */
  trendWindow?: number;
  /** Minimum variety score (0-100) */
  minVarietyScore?: number;
}

/**
 * Default hook configuration
 */
export const DEFAULT_HOOKS_CONFIG: Required<HooksConfig> = {
  weakHookThreshold: 50,
  repetitionThreshold: 3,
  trendWindow: 10,
  minVarietyScore: 40,
};

/**
 * Severity levels for hook warnings
 */
export type HookWarningSeverity = 'critical' | 'warning' | 'info';

/**
 * A hook warning or issue
 */
export interface HookWarning {
  /** Type of warning */
  type:
    | 'weak-hook'
    | 'missing-hook'
    | 'repetition'
    | 'low-variety'
    | 'declining-strength'
    | 'missing-analysis';
  /** Severity of the warning */
  severity: HookWarningSeverity;
  /** Warning message */
  message: string;
  /** Affected structure IDs */
  affectedStructures: string[];
  /** Suggested action */
  suggestion?: string;
}

/**
 * Hook data for a single chapter
 */
export interface ChapterHookData {
  /** Structure ID */
  structureId: string;
  /** Chapter title */
  title: string;
  /** Chapter position (1-indexed) */
  position: number;
  /** Hook type detected */
  hookType?: HookType | 'none';
  /** Hook strength score (0-100) */
  hookStrength?: number;
  /** Planned hook type from structure */
  plannedHookType?: HookType;
  /** Whether content exists */
  hasContent: boolean;
  /** Whether hook analysis exists */
  hasAnalysis: boolean;
  /** Content ID if exists */
  contentId?: string;
  /** Improvement suggestions from analysis */
  improvements?: string[];
}

/**
 * Hook distribution across hook types
 */
export interface HookDistribution {
  /** Total chapters analyzed */
  total: number;
  /** Count per hook type */
  distribution: Record<HookType | 'none', number>;
  /** Most common hook type */
  mostCommon: HookType | 'none';
  /** Least used hook types */
  leastUsed: HookType[];
  /** Hook types never used */
  unused: HookType[];
}

/**
 * Hook strength trend information
 */
export interface HookStrengthTrend {
  /** Trend direction */
  direction: 'improving' | 'stable' | 'declining';
  /** Trend slope (positive = improving) */
  slope: number;
  /** Average hook strength */
  average: number;
  /** Minimum strength */
  min: number;
  /** Maximum strength */
  max: number;
  /** Number of weak hooks */
  weakHookCount: number;
}

/**
 * Repetition pattern detail
 */
export interface HookRepetition {
  /** The repeated hook type */
  hookType: HookType | 'none';
  /** Starting position */
  startPosition: number;
  /** Ending position */
  endPosition: number;
  /** Number of consecutive uses */
  count: number;
  /** Affected structure IDs */
  structureIds: string[];
}

/**
 * A recommendation for improving hooks
 */
export interface HookRecommendation {
  /** Recommendation type */
  type: 'strengthen' | 'diversify' | 'plan' | 'analyze';
  /** Priority (1 = highest) */
  priority: number;
  /** Recommendation message */
  message: string;
  /** Affected structures */
  affectedStructures: string[];
  /** Suggested actions */
  actions: string[];
  /** Suggested hook types to use */
  suggestedHookTypes?: HookType[];
}

/**
 * Summary of hook analysis for a structure
 */
export interface HookSummary {
  /** Structure being analyzed */
  structureId: string;
  /** Structure title */
  title: string;
  /** Overall average hook strength */
  averageStrength: number;
  /** Hook variety score (0-100) */
  varietyScore: number;
  /** Number of chapters analyzed */
  chaptersAnalyzed: number;
  /** Total chapters */
  totalChapters: number;
  /** Hook distribution */
  distribution: HookDistribution;
  /** Strength trend */
  trend: HookStrengthTrend;
  /** Repetition patterns detected */
  repetitions: HookRepetition[];
  /** Active warnings */
  warnings: HookWarning[];
}

/**
 * Result of comprehensive hook analysis
 */
export interface HookAnalysisReport {
  /** Summary for the root structure */
  summary: HookSummary;
  /** Per-chapter data */
  chapterData: ChapterHookData[];
  /** All warnings across structure */
  warnings: HookWarning[];
  /** Recommendations for improvement */
  recommendations: HookRecommendation[];
  /** Suggested hook type for next chapter */
  suggestedNextHook?: HookType;
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
 * Classify hook type from analysis explanation
 *
 * Attempts to determine the hook type from the explanation text
 * when explicit hook type is not stored.
 */
export function classifyHookFromExplanation(explanation: string): HookType | 'none' {
  const lowerExplanation = explanation.toLowerCase();

  if (lowerExplanation.includes('cliffhanger') || lowerExplanation.includes('cliff-hanger')) {
    return 'cliffhanger';
  }
  if (lowerExplanation.includes('revelation') || lowerExplanation.includes('reveal')) {
    return 'revelation';
  }
  if (lowerExplanation.includes('decision') || lowerExplanation.includes('choice')) {
    return 'decision';
  }
  if (lowerExplanation.includes('emotional') || lowerExplanation.includes('feeling')) {
    return 'emotional';
  }
  if (lowerExplanation.includes('question') || lowerExplanation.includes('mystery')) {
    return 'question';
  }
  if (lowerExplanation.includes('twist') || lowerExplanation.includes('unexpected')) {
    return 'twist';
  }
  if (lowerExplanation.includes('promise') || lowerExplanation.includes('anticipation')) {
    return 'promise';
  }
  if (lowerExplanation.includes('no hook') || lowerExplanation.includes('weak ending')) {
    return 'none';
  }

  return 'none';
}

/**
 * Get content and analysis for a chapter
 */
function getChapterData(
  projectId: string,
  chapter: Structure,
  deps: HookAnalysisDependencies
): { content?: Content; analysis?: ContentAnalysis } {
  const content = deps.contentRepository.findByStructure(projectId, chapter.id);
  let analysis: ContentAnalysis | undefined;

  if (content) {
    analysis = deps.analysisRepository.findLatest(projectId, content.id);
  }

  return { content, analysis };
}

/**
 * Build chapter hook data for a single chapter
 */
function buildChapterData(
  chapter: Structure,
  position: number,
  data: { content?: Content; analysis?: ContentAnalysis }
): ChapterHookData {
  let hookType: HookType | 'none' | undefined;
  let hookStrength: number | undefined;
  let improvements: string[] | undefined;

  if (data.analysis?.hookStrength) {
    hookStrength = data.analysis.hookStrength.score;
    hookType = classifyHookFromExplanation(data.analysis.hookStrength.explanation);
  }

  return {
    structureId: chapter.id,
    title: chapter.title,
    position,
    hookType,
    hookStrength,
    plannedHookType: chapter.hook?.type,
    hasContent: data.content !== undefined,
    hasAnalysis: data.analysis?.hookStrength !== undefined,
    contentId: data.content?.id,
    improvements,
  };
}

/**
 * Calculate hook distribution from chapter data
 */
export function calculateHookDistribution(chapterData: ChapterHookData[]): HookDistribution {
  const analyzed = chapterData.filter((c) => c.hookType !== undefined);

  // Initialize distribution with all hook types
  const distribution: Record<HookType | 'none', number> = {
    revelation: 0,
    decision: 0,
    cliffhanger: 0,
    emotional: 0,
    question: 0,
    twist: 0,
    promise: 0,
    none: 0,
  };

  // Count each hook type
  for (const chapter of analyzed) {
    if (chapter.hookType) {
      distribution[chapter.hookType]++;
    }
  }

  // Find most common
  let mostCommon: HookType | 'none' = 'none';
  let maxCount = 0;
  for (const [type, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = type as HookType | 'none';
    }
  }

  // Find least used (excluding 'none')
  const leastUsed: HookType[] = [];
  const unused: HookType[] = [];
  const hookTypes = HOOK_TYPES as readonly HookType[];

  for (const type of hookTypes) {
    if (distribution[type] === 0) {
      unused.push(type);
    } else if (distribution[type] < analyzed.length * 0.1) {
      // Less than 10% usage
      leastUsed.push(type);
    }
  }

  return {
    total: analyzed.length,
    distribution,
    mostCommon,
    leastUsed,
    unused,
  };
}

/**
 * Calculate hook variety score (0-100)
 *
 * Higher score means more diverse hook usage.
 */
export function calculateVarietyScore(distribution: HookDistribution): number {
  if (distribution.total === 0) return 0;

  const hookTypes = HOOK_TYPES as readonly HookType[];
  const typesUsed = hookTypes.filter((type) => distribution.distribution[type] > 0).length;
  const totalTypes = hookTypes.length;

  // Base score from number of types used
  const baseScore = (typesUsed / totalTypes) * 100;

  // Penalty for very uneven distribution
  const counts = hookTypes.map((type) => distribution.distribution[type]);
  const max = Math.max(...counts);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const evenness = max > 0 ? avg / max : 1;

  return Math.round(baseScore * 0.7 + evenness * 30);
}

/**
 * Calculate hook strength trend from chapter data
 */
export function calculateHookStrengthTrend(
  chapterData: ChapterHookData[],
  weakThreshold: number
): HookStrengthTrend {
  const strengths = chapterData
    .filter((c) => c.hookStrength !== undefined)
    .map((c) => c.hookStrength!);

  if (strengths.length === 0) {
    return {
      direction: 'stable',
      slope: 0,
      average: 0,
      min: 0,
      max: 0,
      weakHookCount: 0,
    };
  }

  const average = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
  const min = Math.min(...strengths);
  const max = Math.max(...strengths);
  const weakHookCount = strengths.filter((s) => s < weakThreshold).length;

  // Calculate slope using simple linear regression
  let slope = 0;
  if (strengths.length >= 2) {
    const n = strengths.length;
    const xMean = (n - 1) / 2;
    const yMean = average;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (strengths[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    slope = denominator !== 0 ? numerator / denominator : 0;
  }

  // Determine direction
  let direction: HookStrengthTrend['direction'];
  const slopeThreshold = 1;

  if (slope > slopeThreshold) {
    direction = 'improving';
  } else if (slope < -slopeThreshold) {
    direction = 'declining';
  } else {
    direction = 'stable';
  }

  return {
    direction,
    slope,
    average,
    min,
    max,
    weakHookCount,
  };
}

/**
 * Detect hook repetition patterns
 */
export function detectRepetitions(
  chapterData: ChapterHookData[],
  threshold: number
): HookRepetition[] {
  const repetitions: HookRepetition[] = [];
  const analyzed = chapterData.filter((c) => c.hookType !== undefined);

  if (analyzed.length < threshold) return [];

  let currentType: HookType | 'none' | undefined;
  let startPos = 0;
  let count = 0;
  let structureIds: string[] = [];

  for (let i = 0; i < analyzed.length; i++) {
    const chapter = analyzed[i];

    if (chapter.hookType === currentType) {
      count++;
      structureIds.push(chapter.structureId);
    } else {
      // End of streak
      if (count >= threshold && currentType !== 'none') {
        repetitions.push({
          hookType: currentType!,
          startPosition: startPos,
          endPosition: analyzed[i - 1].position,
          count,
          structureIds: [...structureIds],
        });
      }

      // Start new streak
      currentType = chapter.hookType;
      startPos = chapter.position;
      count = 1;
      structureIds = [chapter.structureId];
    }
  }

  // Check final streak
  if (count >= threshold && currentType !== 'none') {
    repetitions.push({
      hookType: currentType!,
      startPosition: startPos,
      endPosition: analyzed[analyzed.length - 1].position,
      count,
      structureIds: [...structureIds],
    });
  }

  return repetitions;
}

/**
 * Generate hook warnings from chapter data
 */
export function generateHookWarnings(
  chapterData: ChapterHookData[],
  distribution: HookDistribution,
  trend: HookStrengthTrend,
  repetitions: HookRepetition[],
  config: Required<HooksConfig>
): HookWarning[] {
  const warnings: HookWarning[] = [];

  // Weak hooks
  const weakHooks = chapterData.filter(
    (c) => c.hookStrength !== undefined && c.hookStrength < config.weakHookThreshold
  );
  if (weakHooks.length > 0) {
    warnings.push({
      type: 'weak-hook',
      severity: weakHooks.length > 2 ? 'warning' : 'info',
      message: `${weakHooks.length} chapter(s) have weak hooks (strength < ${config.weakHookThreshold})`,
      affectedStructures: weakHooks.map((c) => c.structureId),
      suggestion: 'Consider strengthening chapter endings with more compelling hooks',
    });
  }

  // Missing hooks (content but no hook)
  const noHooks = chapterData.filter(
    (c) => c.hasContent && c.hookType === 'none'
  );
  if (noHooks.length > 0) {
    warnings.push({
      type: 'missing-hook',
      severity: noHooks.length > 1 ? 'warning' : 'info',
      message: `${noHooks.length} chapter(s) have no effective hook`,
      affectedStructures: noHooks.map((c) => c.structureId),
      suggestion: 'Add compelling hooks to maintain reader engagement',
    });
  }

  // Repetition warnings
  for (const rep of repetitions) {
    warnings.push({
      type: 'repetition',
      severity: rep.count > 4 ? 'warning' : 'info',
      message: `"${rep.hookType}" hook used ${rep.count} times consecutively (chapters ${rep.startPosition}-${rep.endPosition})`,
      affectedStructures: rep.structureIds,
      suggestion: `Consider varying hook types for reader engagement`,
    });
  }

  // Low variety
  const varietyScore = calculateVarietyScore(distribution);
  if (varietyScore < config.minVarietyScore && distribution.total > 3) {
    warnings.push({
      type: 'low-variety',
      severity: varietyScore < 25 ? 'warning' : 'info',
      message: `Hook variety is low (${varietyScore}%). Unused types: ${distribution.unused.join(', ')}`,
      affectedStructures: [],
      suggestion: 'Try using different hook types for more engaging reading experience',
    });
  }

  // Declining strength
  if (trend.direction === 'declining' && trend.slope < -2) {
    warnings.push({
      type: 'declining-strength',
      severity: 'warning',
      message: 'Hook strength is declining over recent chapters',
      affectedStructures: [],
      suggestion: 'Focus on creating stronger hooks to maintain reader engagement',
    });
  }

  // Missing analysis
  const missingAnalysis = chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
  if (missingAnalysis.length > 0) {
    warnings.push({
      type: 'missing-analysis',
      severity: 'info',
      message: `${missingAnalysis.length} chapter(s) need hook analysis`,
      affectedStructures: missingAnalysis.map((c) => c.structureId),
      suggestion: 'Run analysis on these chapters to track hook effectiveness',
    });
  }

  return warnings;
}

/**
 * Suggest next hook type based on recent patterns
 */
export function suggestNextHookType(
  chapterData: ChapterHookData[],
  distribution: HookDistribution
): HookType | undefined {
  if (chapterData.length === 0) return undefined;

  const hookTypes = HOOK_TYPES as readonly HookType[];

  // Prefer unused types
  if (distribution.unused.length > 0) {
    return distribution.unused[0];
  }

  // Get last few hooks
  const recentHooks = chapterData
    .slice(-3)
    .filter((c) => c.hookType && c.hookType !== 'none')
    .map((c) => c.hookType as HookType);

  // Avoid repeating recent hooks
  const candidates = hookTypes.filter((type) => !recentHooks.includes(type));

  if (candidates.length > 0) {
    // Prefer least used among candidates
    const sortedByUsage = candidates.sort(
      (a, b) => distribution.distribution[a] - distribution.distribution[b]
    );
    return sortedByUsage[0];
  }

  // Fall back to least used overall
  const sorted = [...hookTypes].sort(
    (a, b) => distribution.distribution[a] - distribution.distribution[b]
  );
  return sorted[0];
}

/**
 * Generate recommendations based on analysis
 */
export function generateHookRecommendations(
  chapterData: ChapterHookData[],
  warnings: HookWarning[],
  distribution: HookDistribution,
  _trend: HookStrengthTrend
): HookRecommendation[] {
  const recommendations: HookRecommendation[] = [];

  // Recommendation for weak hooks
  const weakWarning = warnings.find((w) => w.type === 'weak-hook');
  if (weakWarning) {
    recommendations.push({
      type: 'strengthen',
      priority: 1,
      message: 'Improve hook strength in affected chapters',
      affectedStructures: weakWarning.affectedStructures,
      actions: [
        'End chapters on moments of tension or uncertainty',
        'Use unanswered questions to pull readers forward',
        'Create emotional stakes that demand resolution',
      ],
    });
  }

  // Recommendation for low variety
  const varietyWarning = warnings.find((w) => w.type === 'low-variety');
  if (varietyWarning) {
    recommendations.push({
      type: 'diversify',
      priority: 2,
      message: 'Use a wider variety of hook types',
      affectedStructures: [],
      actions: [
        'Rotate between different hook types',
        'Match hook type to chapter content',
        'Plan hooks during outline phase',
      ],
      suggestedHookTypes: distribution.unused.slice(0, 3) as HookType[],
    });
  }

  // Recommendation for repetition
  const repetitionWarnings = warnings.filter((w) => w.type === 'repetition');
  if (repetitionWarnings.length > 0) {
    const allAffected = repetitionWarnings.flatMap((w) => w.affectedStructures);
    recommendations.push({
      type: 'diversify',
      priority: 2,
      message: 'Break up repetitive hook patterns',
      affectedStructures: allAffected,
      actions: [
        'Alternate hook types between chapters',
        'Consider the emotional journey when selecting hooks',
        'Use different hooks for different story beats',
      ],
    });
  }

  // Recommendation for missing analysis
  const analysisWarning = warnings.find((w) => w.type === 'missing-analysis');
  if (analysisWarning) {
    recommendations.push({
      type: 'analyze',
      priority: 3,
      message: 'Complete hook analysis for all chapters',
      affectedStructures: analysisWarning.affectedStructures,
      actions: ['Run analysis on chapters without hook data'],
    });
  }

  // Recommendation based on no planned hooks
  const noPlannedHooks = chapterData.filter(
    (c) => c.hasContent && !c.plannedHookType
  );
  if (noPlannedHooks.length > chapterData.length * 0.5) {
    recommendations.push({
      type: 'plan',
      priority: 4,
      message: 'Plan hooks during structure phase',
      affectedStructures: noPlannedHooks.map((c) => c.structureId),
      actions: [
        'Set planned hook type for each chapter in structure',
        'Consider arc-level hook patterns',
        'Plan hook variety at the book level',
      ],
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Generate comprehensive hook analysis report
 *
 * Analyzes hooks across an entire structure tree, producing
 * warnings, trends, and recommendations.
 */
export function analyzeHooks(
  input: HookAnalysisInput,
  deps: HookAnalysisDependencies,
  config?: HooksConfig
): HookAnalysisReport {
  const mergedConfig = { ...DEFAULT_HOOKS_CONFIG, ...config };

  // Collect all chapters
  const chapters = collectChapters(input.rootStructure);

  // Build chapter data
  const chapterData: ChapterHookData[] = chapters.map((chapter, index) => {
    const data = getChapterData(input.projectId, chapter, deps);
    return buildChapterData(chapter, index + 1, data);
  });

  // Calculate distribution
  const distribution = calculateHookDistribution(chapterData);

  // Calculate variety score
  const varietyScore = calculateVarietyScore(distribution);

  // Calculate strength trend
  const trend = calculateHookStrengthTrend(chapterData, mergedConfig.weakHookThreshold);

  // Detect repetitions
  const repetitions = detectRepetitions(chapterData, mergedConfig.repetitionThreshold);

  // Generate warnings
  const warnings = generateHookWarnings(
    chapterData,
    distribution,
    trend,
    repetitions,
    mergedConfig
  );

  // Generate recommendations
  const recommendations = generateHookRecommendations(chapterData, warnings, distribution, trend);

  // Suggest next hook
  const suggestedNextHook = suggestNextHookType(chapterData, distribution);

  // Calculate summary statistics
  const analyzedChapters = chapterData.filter((c) => c.hasAnalysis);

  const summary: HookSummary = {
    structureId: input.rootStructure.id,
    title: input.rootStructure.title,
    averageStrength: trend.average,
    varietyScore,
    chaptersAnalyzed: analyzedChapters.length,
    totalChapters: chapterData.length,
    distribution,
    trend,
    repetitions,
    warnings,
  };

  return {
    summary,
    chapterData,
    warnings,
    recommendations,
    suggestedNextHook,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Analyze hooks with explicit dependency injection
 */
export function analyzeHooksWithDeps(
  input: HookAnalysisInput,
  deps: HookAnalysisDependencies,
  config?: HooksConfig
): HookAnalysisReport {
  return analyzeHooks(input, deps, config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get chapters with weak hooks
 */
export function getWeakHookChapters(
  report: HookAnalysisReport,
  threshold: number = DEFAULT_HOOKS_CONFIG.weakHookThreshold
): ChapterHookData[] {
  return report.chapterData.filter(
    (c) => c.hookStrength !== undefined && c.hookStrength < threshold
  );
}

/**
 * Get chapters with no hook
 */
export function getChaptersWithoutHooks(report: HookAnalysisReport): ChapterHookData[] {
  return report.chapterData.filter((c) => c.hasAnalysis && c.hookType === 'none');
}

/**
 * Get chapters missing hook analysis
 */
export function getUnanalyzedChapters(report: HookAnalysisReport): ChapterHookData[] {
  return report.chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
}

/**
 * Check if hooks need attention
 */
export function hooksNeedAttention(report: HookAnalysisReport): boolean {
  return report.warnings.some((w) => w.severity === 'critical' || w.severity === 'warning');
}

/**
 * Get hook usage summary by type
 */
export function getHookUsageByType(
  report: HookAnalysisReport
): Array<{ type: HookType | 'none'; count: number; percentage: number }> {
  const hookTypes: (HookType | 'none')[] = [...(HOOK_TYPES as readonly HookType[]), 'none'];

  return hookTypes.map((type) => ({
    type,
    count: report.summary.distribution.distribution[type],
    percentage:
      report.summary.distribution.total > 0
        ? (report.summary.distribution.distribution[type] / report.summary.distribution.total) * 100
        : 0,
  }));
}

/**
 * Get analysis completion percentage
 */
export function getHookAnalysisCompletion(report: HookAnalysisReport): number {
  const withContent = report.chapterData.filter((c) => c.hasContent);
  if (withContent.length === 0) return 0;
  const analyzed = withContent.filter((c) => c.hasAnalysis);
  return (analyzed.length / withContent.length) * 100;
}

/**
 * Get chapters by hook type
 */
export function getChaptersByHookType(
  report: HookAnalysisReport,
  hookType: HookType | 'none'
): ChapterHookData[] {
  return report.chapterData.filter((c) => c.hookType === hookType);
}

/**
 * Get strongest hooks
 */
export function getStrongestHooks(
  report: HookAnalysisReport,
  count: number = 5
): ChapterHookData[] {
  return report.chapterData
    .filter((c) => c.hookStrength !== undefined)
    .sort((a, b) => b.hookStrength! - a.hookStrength!)
    .slice(0, count);
}
