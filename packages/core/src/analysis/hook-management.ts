/**
 * Hook management for web serial content
 *
 * Provides functions to:
 * - Classify and analyze hook patterns
 * - Track hook strength trends
 * - Detect repetition and variety issues
 * - Generate variety enforcement warnings
 *
 * Phase 5.1 implementation
 */

import type {
  ContentAnalysis,
  HookPatternAnalysis,
  HookType,
  SerialSettings,
  Structure,
} from '@repo/types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';

/**
 * Hook data point extracted from content analysis
 */
export interface HookDataPoint {
  /** Content ID */
  contentId: string;
  /** Chapter position in reading order (1-indexed) */
  position: number;
  /** Hook type detected by analysis */
  hookType: HookType | 'none';
  /** Hook strength score (0-100) */
  strength: number;
  /** Chapter title (for display) */
  title?: string;
}

/**
 * Result of hook pattern analysis
 */
export interface HookPatternResult {
  /** Full pattern analysis */
  analysis: HookPatternAnalysis;
  /** Detailed repetition information */
  repetitionDetails: RepetitionDetail[];
  /** Hook strength trend information */
  strengthTrend: StrengthTrendInfo;
}

/**
 * Detail about a repetition pattern
 */
export interface RepetitionDetail {
  /** The repeated hook type */
  hookType: HookType;
  /** Starting position of the repetition */
  startPosition: number;
  /** Ending position of the repetition */
  endPosition: number;
  /** Number of consecutive uses */
  consecutiveCount: number;
  /** Content IDs involved */
  contentIds: string[];
}

/**
 * Hook strength trend information
 */
export interface StrengthTrendInfo {
  /** Average strength over the analysis window */
  average: number;
  /** Minimum strength */
  min: number;
  /** Maximum strength */
  max: number;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Trend slope (positive = improving) */
  slope: number;
  /** Hooks below threshold (weak hooks) */
  weakHooks: Array<{
    contentId: string;
    position: number;
    strength: number;
  }>;
}

/**
 * Configuration for hook analysis
 */
export interface HookAnalysisConfig {
  /** Minimum acceptable hook strength */
  weakHookThreshold?: number;
  /** Number of recent chapters to analyze */
  analysisWindow?: number;
  /** Whether to include chapters with no hook analysis */
  includeUnanalyzed?: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_HOOK_ANALYSIS_CONFIG: Required<HookAnalysisConfig> = {
  weakHookThreshold: 50,
  analysisWindow: 20,
  includeUnanalyzed: false,
};

/**
 * All valid hook types (excluding 'none')
 */
export const HOOK_TYPES: HookType[] = [
  'revelation',
  'decision',
  'cliffhanger',
  'emotional',
  'question',
  'twist',
  'promise',
];

/**
 * Extract hook data points from content analyses
 *
 * @param analyses - Content analyses with hook strength data
 * @param positionMap - Map of content ID to chapter position
 * @param titleMap - Optional map of content ID to chapter title
 * @returns Hook data points sorted by position
 */
export function extractHookDataPoints(
  analyses: ContentAnalysis[],
  positionMap: Map<string, number>,
  titleMap?: Map<string, string>
): HookDataPoint[] {
  const dataPoints: HookDataPoint[] = [];

  for (const analysis of analyses) {
    const position = positionMap.get(analysis.contentId);
    if (position === undefined) continue;

    // Skip if no hook analysis
    if (!analysis.hookStrength) continue;

    // Extract hook type from analysis
    // The hook type is stored in the analysis service result, but ContentAnalysis
    // only stores hookStrength. We need to determine the type.
    // For now, we'll look for the hook type in a consistent way.
    // The hookStrength.explanation often contains the hook type.
    const hookType = classifyHookFromExplanation(analysis.hookStrength.explanation);

    dataPoints.push({
      contentId: analysis.contentId,
      position,
      hookType,
      strength: analysis.hookStrength.score,
      title: titleMap?.get(analysis.contentId),
    });
  }

  // Sort by position
  return dataPoints.sort((a, b) => a.position - b.position);
}

/**
 * Classify hook type from the analysis explanation
 *
 * The LLM analysis includes the hook type in its explanation.
 * This extracts it for pattern analysis.
 */
export function classifyHookFromExplanation(explanation: string): HookType | 'none' {
  const lowerExplanation = explanation.toLowerCase();

  // Check for each hook type keyword
  for (const hookType of HOOK_TYPES) {
    if (lowerExplanation.includes(hookType)) {
      return hookType;
    }
  }

  // Also check for common variations
  if (lowerExplanation.includes('cliff-hanger') || lowerExplanation.includes('suspense')) {
    return 'cliffhanger';
  }
  if (lowerExplanation.includes('reveal') || lowerExplanation.includes('discovery')) {
    return 'revelation';
  }
  if (lowerExplanation.includes('choice') || lowerExplanation.includes('dilemma')) {
    return 'decision';
  }
  if (lowerExplanation.includes('emotion') || lowerExplanation.includes('feeling')) {
    return 'emotional';
  }
  if (lowerExplanation.includes('mystery') || lowerExplanation.includes('unanswered')) {
    return 'question';
  }

  return 'none';
}

/**
 * Calculate hook type distribution
 *
 * @param dataPoints - Hook data points to analyze
 * @returns Distribution of hook types (count per type)
 */
export function calculateHookDistribution(
  dataPoints: HookDataPoint[]
): Record<string, number> {
  const distribution: Record<string, number> = {};

  // Initialize all types to 0
  for (const hookType of HOOK_TYPES) {
    distribution[hookType] = 0;
  }
  distribution['none'] = 0;

  // Count occurrences
  for (const dataPoint of dataPoints) {
    distribution[dataPoint.hookType] = (distribution[dataPoint.hookType] || 0) + 1;
  }

  return distribution;
}

/**
 * Calculate variety score based on hook type distribution
 *
 * Higher scores indicate more varied hook usage.
 * Score is based on Shannon entropy normalized to 0-100.
 */
export function calculateVarietyScore(distribution: Record<string, number>): number {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;

  // Calculate Shannon entropy
  let entropy = 0;
  for (const count of Object.values(distribution)) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize to 0-100 (max entropy for 7 types = log2(7) ≈ 2.807)
  const maxEntropy = Math.log2(HOOK_TYPES.length);
  const normalizedScore = (entropy / maxEntropy) * 100;

  return Math.round(normalizedScore);
}

/**
 * Detect consecutive repetitions of hook types
 *
 * @param dataPoints - Hook data points in position order
 * @param maxConsecutive - Maximum allowed consecutive same-type hooks
 * @returns Array of repetition details for violations
 */
export function detectRepetitions(
  dataPoints: HookDataPoint[],
  maxConsecutive: number
): RepetitionDetail[] {
  if (dataPoints.length === 0) return [];

  const repetitions: RepetitionDetail[] = [];
  let currentType = dataPoints[0].hookType;
  let currentStart = dataPoints[0].position;
  let currentContentIds: string[] = [dataPoints[0].contentId];
  let count = 1;

  for (let i = 1; i < dataPoints.length; i++) {
    const point = dataPoints[i];

    if (point.hookType === currentType && point.hookType !== 'none') {
      count++;
      currentContentIds.push(point.contentId);
    } else {
      // Check if previous run exceeded limit
      if (count > maxConsecutive && currentType !== 'none') {
        repetitions.push({
          hookType: currentType as HookType,
          startPosition: currentStart,
          endPosition: dataPoints[i - 1].position,
          consecutiveCount: count,
          contentIds: currentContentIds,
        });
      }

      // Reset for new type
      currentType = point.hookType;
      currentStart = point.position;
      currentContentIds = [point.contentId];
      count = 1;
    }
  }

  // Check final run
  if (count > maxConsecutive && currentType !== 'none') {
    repetitions.push({
      hookType: currentType as HookType,
      startPosition: currentStart,
      endPosition: dataPoints[dataPoints.length - 1].position,
      consecutiveCount: count,
      contentIds: currentContentIds,
    });
  }

  return repetitions;
}

/**
 * Calculate hook strength trend
 *
 * @param dataPoints - Hook data points in position order
 * @param config - Analysis configuration
 * @returns Strength trend information
 */
export function calculateStrengthTrend(
  dataPoints: HookDataPoint[],
  config: HookAnalysisConfig = {}
): StrengthTrendInfo {
  const mergedConfig = { ...DEFAULT_HOOK_ANALYSIS_CONFIG, ...config };

  if (dataPoints.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      trend: 'stable',
      slope: 0,
      weakHooks: [],
    };
  }

  // Calculate basic statistics
  const strengths = dataPoints.map((dp) => dp.strength);
  const average = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
  const min = Math.min(...strengths);
  const max = Math.max(...strengths);

  // Calculate linear regression slope for trend
  const slope = calculateLinearSlope(dataPoints.map((dp) => dp.strength));

  // Determine trend direction
  let trend: 'improving' | 'stable' | 'declining';
  if (slope > 0.5) {
    trend = 'improving';
  } else if (slope < -0.5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  // Find weak hooks
  const weakHooks = dataPoints
    .filter((dp) => dp.strength < mergedConfig.weakHookThreshold)
    .map((dp) => ({
      contentId: dp.contentId,
      position: dp.position,
      strength: dp.strength,
    }));

  return {
    average: Math.round(average),
    min,
    max,
    trend,
    slope: Math.round(slope * 100) / 100,
    weakHooks,
  };
}

/**
 * Calculate linear regression slope
 */
function calculateLinearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  // Using indices as x values (0, 1, 2, ...)
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Generate variety warnings based on hook patterns
 *
 * @param dataPoints - Hook data points
 * @param settings - Serial settings with hook variety configuration
 * @param config - Analysis configuration
 * @returns Array of warning messages
 */
export function generateVarietyWarnings(
  dataPoints: HookDataPoint[],
  settings?: SerialSettings,
  config: HookAnalysisConfig = {}
): string[] {
  const mergedConfig = { ...DEFAULT_HOOK_ANALYSIS_CONFIG, ...config };
  const maxConsecutive = settings?.maxConsecutiveSameHook ?? 2;
  const enforceVariety = settings?.enforceHookVariety ?? true;

  const warnings: string[] = [];

  if (dataPoints.length === 0) {
    return warnings;
  }

  // Check for repetitions
  const repetitions = detectRepetitions(dataPoints, maxConsecutive);
  for (const rep of repetitions) {
    warnings.push(
      `Hook variety issue: ${rep.consecutiveCount} consecutive "${rep.hookType}" hooks ` +
      `(chapters ${rep.startPosition}-${rep.endPosition}). ` +
      `Maximum allowed: ${maxConsecutive}.`
    );
  }

  // Check variety score
  if (enforceVariety) {
    const distribution = calculateHookDistribution(dataPoints);
    const varietyScore = calculateVarietyScore(distribution);

    if (varietyScore < 30) {
      warnings.push(
        `Low hook variety (score: ${varietyScore}/100). ` +
        `Consider using more diverse hook types to maintain reader engagement.`
      );
    }

    // Check for dominant type
    const total = dataPoints.length;
    for (const [hookType, count] of Object.entries(distribution)) {
      if (hookType !== 'none' && count / total > 0.5 && total >= 4) {
        warnings.push(
          `Hook type "${hookType}" is overused (${Math.round((count / total) * 100)}% of chapters). ` +
          `Try incorporating more variety.`
        );
      }
    }

    // Check for unused types
    const unusedTypes = HOOK_TYPES.filter((type) => distribution[type] === 0);
    if (unusedTypes.length >= 4 && total >= 5) {
      warnings.push(
        `Limited hook variety: ${unusedTypes.length} hook types never used ` +
        `(${unusedTypes.join(', ')}). ` +
        `Consider exploring different ending styles.`
      );
    }
  }

  // Check for strength issues
  const strengthTrend = calculateStrengthTrend(dataPoints, mergedConfig);

  if (strengthTrend.weakHooks.length >= 3) {
    warnings.push(
      `${strengthTrend.weakHooks.length} chapters have weak hooks (below ${mergedConfig.weakHookThreshold}). ` +
      `Consider strengthening chapter endings.`
    );
  }

  if (strengthTrend.trend === 'declining' && dataPoints.length >= 5) {
    warnings.push(
      `Hook strength is declining (trend slope: ${strengthTrend.slope}). ` +
      `Recent chapters may have weaker endings than earlier ones.`
    );
  }

  if (strengthTrend.average < 50 && dataPoints.length >= 3) {
    warnings.push(
      `Average hook strength is below standard (${strengthTrend.average}/100). ` +
      `Chapter endings should generally score 50+ for good reader engagement.`
    );
  }

  return warnings;
}

/**
 * Analyze hook patterns and generate full pattern analysis
 *
 * @param analyses - Content analyses with hook data
 * @param positionMap - Map of content ID to chapter position
 * @param settings - Serial settings for variety enforcement
 * @param config - Analysis configuration
 * @returns Complete hook pattern analysis result
 */
export function analyzeHookPatterns(
  analyses: ContentAnalysis[],
  positionMap: Map<string, number>,
  settings?: SerialSettings,
  config: HookAnalysisConfig = {}
): HookPatternResult {
  const mergedConfig = { ...DEFAULT_HOOK_ANALYSIS_CONFIG, ...config };
  const maxConsecutive = settings?.maxConsecutiveSameHook ?? 2;

  // Extract data points
  const dataPoints = extractHookDataPoints(analyses, positionMap);

  // Limit to analysis window
  const windowedPoints = dataPoints.slice(-mergedConfig.analysisWindow);

  // Calculate distribution and variety
  const distribution = calculateHookDistribution(windowedPoints);
  const varietyScore = calculateVarietyScore(distribution);

  // Detect repetitions
  const repetitions = detectRepetitions(windowedPoints, maxConsecutive);

  // Calculate strength trend
  const strengthTrend = calculateStrengthTrend(windowedPoints, mergedConfig);

  // Generate warnings
  const warnings = generateVarietyWarnings(windowedPoints, settings, mergedConfig);

  // Build recent hooks array for HookPatternAnalysis
  const recentHooks: HookPatternAnalysis['recentHooks'] = windowedPoints
    .filter((dp): dp is HookDataPoint & { hookType: HookType } =>
      dp.hookType !== 'none'
    )
    .map((dp) => ({
      contentId: dp.contentId,
      hookType: dp.hookType,
      strength: dp.strength,
    }));

  const analysis: HookPatternAnalysis = {
    recentHooks,
    distribution,
    varietyScore,
    warnings,
  };

  return {
    analysis,
    repetitionDetails: repetitions,
    strengthTrend,
  };
}

/**
 * Get hook usage summary for a project
 *
 * @param dataPoints - All hook data points
 * @returns Human-readable summary
 */
export function getHookUsageSummary(dataPoints: HookDataPoint[]): string {
  if (dataPoints.length === 0) {
    return 'No hook data available for analysis.';
  }

  const distribution = calculateHookDistribution(dataPoints);
  const varietyScore = calculateVarietyScore(distribution);
  const strengthTrend = calculateStrengthTrend(dataPoints);

  const lines: string[] = [
    `Hook Analysis Summary (${dataPoints.length} chapters):`,
    `  Variety score: ${varietyScore}/100`,
    `  Average strength: ${strengthTrend.average}/100`,
    `  Strength trend: ${strengthTrend.trend}`,
    ``,
    `Hook type distribution:`,
  ];

  // Sort by count descending
  const sortedTypes = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  for (const [hookType, count] of sortedTypes) {
    const percentage = Math.round((count / dataPoints.length) * 100);
    lines.push(`  ${hookType}: ${count} (${percentage}%)`);
  }

  if (strengthTrend.weakHooks.length > 0) {
    lines.push('');
    lines.push(`Weak hooks: ${strengthTrend.weakHooks.length} chapter(s)`);
  }

  return lines.join('\n');
}

/**
 * Suggest next hook type based on recent pattern
 *
 * Helps authors avoid repetition by suggesting underused types.
 *
 * @param dataPoints - Recent hook data points
 * @param maxConsecutive - Maximum consecutive same-type limit
 * @returns Array of suggested hook types (most recommended first)
 */
export function suggestNextHookType(
  dataPoints: HookDataPoint[],
  maxConsecutive: number = 2
): HookType[] {
  if (dataPoints.length === 0) {
    // No history, any type is fine
    return [...HOOK_TYPES];
  }

  const distribution = calculateHookDistribution(dataPoints);
  const recentPoints = dataPoints.slice(-maxConsecutive);

  // Determine if we're at the consecutive limit for any type
  const lastType = recentPoints[recentPoints.length - 1]?.hookType;
  const isAtLimit = recentPoints.length >= maxConsecutive &&
    recentPoints.every((p) => p.hookType === lastType);

  // Score each type based on:
  // 1. Not at consecutive limit (filter out if at limit)
  // 2. Usage frequency (prefer less used)
  // 3. Recency (prefer types not used recently)

  const typeScores: Array<{ type: HookType; score: number }> = [];

  for (const hookType of HOOK_TYPES) {
    // Skip if at consecutive limit for this type
    if (isAtLimit && hookType === lastType) {
      continue;
    }

    // Base score from inverse frequency (less used = higher score)
    const usageCount = distribution[hookType] || 0;
    const frequencyScore = 100 - (usageCount / Math.max(dataPoints.length, 1)) * 100;

    // Recency score (not used recently = higher score)
    const lastUsedIndex = [...dataPoints].reverse().findIndex((p) => p.hookType === hookType);
    const recencyScore = lastUsedIndex === -1 ? 100 : Math.min(lastUsedIndex * 20, 100);

    // Combined score
    const score = frequencyScore * 0.6 + recencyScore * 0.4;

    typeScores.push({ type: hookType, score });
  }

  // Sort by score descending
  typeScores.sort((a, b) => b.score - a.score);

  return typeScores.map((t) => t.type);
}

// ============================================================================
// High-level wrapper with Input/Dependencies pattern
// ============================================================================

/**
 * Input for hook management analysis
 */
export interface HookManagementInput {
  /** Project ID */
  projectId: string;
  /** Root structure (book or arc) */
  rootStructure: Structure;
  /** Hook variety settings */
  settings?: {
    enforceVariety?: boolean;
    maxConsecutiveSameHook?: number;
  };
}

/**
 * Dependencies for hook management
 */
export interface HookManagementDependencies {
  /** Analysis repository for getting hook data */
  analysisRepository: AnalysisRepository;
  /** Content repository for getting content linked to structures */
  contentRepository: ContentRepository;
}

/**
 * Complete hook management result
 *
 * This interface matches what the HookPatterns visualization component expects
 */
export interface HookManagementResult {
  /** Hook type distribution (count per type) */
  distribution: Record<string, number>;
  /** Data points for visualization */
  dataPoints: HookDataPoint[];
  /** Variety score (0-100) */
  varietyScore: number;
  /** Repetition details */
  repetitionDetails: RepetitionDetail[];
  /** Strength trend information */
  strengthTrend: StrengthTrendInfo;
  /** Warnings about hook patterns */
  warnings: string[];
}

/**
 * Extract chapters from structure in reading order
 */
function extractChaptersForHooks(rootStructure: Structure): Array<{
  structureId: string;
  title: string;
  position: number;
}> {
  const chapters: Array<{
    structureId: string;
    title: string;
    position: number;
  }> = [];

  function traverse(node: Structure): void {
    if (node.type === 'chapter') {
      chapters.push({
        structureId: node.id,
        title: node.title,
        position: chapters.length + 1,
      });
    }
    // Guard against missing children array
    if (!node.children || !Array.isArray(node.children)) {
      return;
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
 * Analyze hook patterns with Input/Dependencies pattern
 *
 * This is the high-level wrapper function that:
 * 1. Extracts chapters from the structure
 * 2. Gets analyses from the repository
 * 3. Builds position and title maps
 * 4. Calls the core analysis function
 *
 * @param input - Hook management input
 * @param deps - Dependencies (repositories)
 * @returns Complete hook management result
 */
export function analyzeHookPatternsWithDeps(
  input: HookManagementInput,
  deps: HookManagementDependencies
): HookManagementResult {
  // Extract chapters from structure
  const chapters = extractChaptersForHooks(input.rootStructure);

  // Get analyses for each chapter
  const analyses: ContentAnalysis[] = [];
  const positionMap = new Map<string, number>();
  const titleMap = new Map<string, string>();

  for (const chapter of chapters) {
    // Get content for this structure
    const content = deps.contentRepository.findByStructure(input.projectId, chapter.structureId);
    if (!content) continue;

    // Get latest analysis for this content
    const analysis = deps.analysisRepository.findLatest(input.projectId, content.id);
    if (!analysis) continue;

    analyses.push(analysis);
    positionMap.set(analysis.contentId, chapter.position);
    titleMap.set(analysis.contentId, chapter.title);
  }

  // Build serial settings from input
  const serialSettings: SerialSettings | undefined = input.settings
    ? {
        cycleLength: 5,
        cycleTensionTargets: [40, 60, 70, 80, 50],
        minimumBuffer: 5,
        releaseInterval: 2,
        enforceHookVariety: input.settings.enforceVariety ?? true,
        maxConsecutiveSameHook: input.settings.maxConsecutiveSameHook ?? 2,
      }
    : undefined;

  // Call the core analysis function
  const result = analyzeHookPatterns(analyses, positionMap, serialSettings);

  // Extract data points for the result
  const dataPoints = extractHookDataPoints(analyses, positionMap, titleMap);

  // Return flat structure matching HookManagementResult interface
  return {
    distribution: result.analysis.distribution,
    dataPoints,
    varietyScore: result.analysis.varietyScore,
    repetitionDetails: result.repetitionDetails,
    strengthTrend: result.strengthTrend,
    warnings: result.analysis.warnings,
  };
}
