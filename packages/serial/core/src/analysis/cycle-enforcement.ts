/**
 * Cycle enforcement for web serial tension patterns
 *
 * Provides functions to:
 * - Configure and manage tension cycles
 * - Calculate position targets within cycles
 * - Detect current cycle phase
 * - Generate rebalancing suggestions
 *
 * Phase 5.2 implementation
 */

import type { ContentAnalysis, SerialSettings, Structure } from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';
import { extractPlannedTension } from './tension-curve';

/**
 * Data point for a chapter within a cycle
 */
export interface CycleDataPoint {
  /** Structure ID of the chapter */
  structureId: string;
  /** Title of the chapter */
  title: string;
  /** Global position (1-indexed, across all chapters) */
  globalPosition: number;
  /** Position within cycle (0-indexed, 0 to cycleLength-1) */
  cyclePosition: number;
  /** Cycle number (1-indexed) */
  cycleNumber: number;
  /** Target tension for this cycle position */
  targetTension: number;
  /** Planned tension from structure (if set) */
  plannedTension?: number;
  /** Actual tension from analysis (if available) */
  actualTension?: number;
  /** Deviation from cycle target */
  deviationFromTarget?: number;
}

/**
 * Cycle position configuration
 */
export interface CyclePositionConfig {
  /** Position within cycle (0-indexed) */
  position: number;
  /** Target tension for this position */
  targetTension: number;
  /** Description of this position's role */
  description?: string;
}

/**
 * Result of cycle phase detection
 */
export interface CyclePhaseResult {
  /** Current cycle number (1-indexed) */
  currentCycle: number;
  /** Position within current cycle (0-indexed) */
  currentPosition: number;
  /** Cycle length (number of positions per cycle) */
  cycleLength: number;
  /** Tension targets for each position in the cycle */
  tensionTargets: number[];
  /** Total chapters in the project */
  totalChapters: number;
  /** Chapters completed in current cycle */
  chaptersInCurrentCycle: number;
  /** Is current cycle complete */
  isCycleComplete: boolean;
  /** Phase description (e.g., "rising", "peak", "falling") */
  phaseDescription: string;
  /** Next position's target tension */
  nextTargetTension?: number;
}

/**
 * A tension violation within a cycle
 */
export interface CycleViolation {
  /** Structure ID of the chapter */
  structureId: string;
  /** Title of the chapter */
  title: string;
  /** Global position */
  globalPosition: number;
  /** Cycle position */
  cyclePosition: number;
  /** Expected tension for this position */
  expectedTension: number;
  /** Actual tension value (from analysis or planned) */
  actualValue: number;
  /** Deviation amount (actual - expected) */
  deviation: number;
  /** Severity level */
  severity: 'minor' | 'moderate' | 'severe';
}

/**
 * Rebalancing suggestion
 */
export interface RebalancingSuggestion {
  /** Target structure ID */
  structureId: string;
  /** Title of the chapter */
  title: string;
  /** Current tension value */
  currentTension: number;
  /** Suggested tension value */
  suggestedTension: number;
  /** Direction of change needed */
  direction: 'increase' | 'decrease';
  /** Priority of this suggestion */
  priority: 'low' | 'medium' | 'high';
  /** Explanation of the suggestion */
  explanation: string;
}

/**
 * Complete cycle enforcement analysis result
 */
export interface CycleEnforcementResult {
  /** All chapter data points with cycle information */
  dataPoints: CycleDataPoint[];
  /** Current cycle phase information */
  phaseInfo: CyclePhaseResult;
  /** Detected violations */
  violations: CycleViolation[];
  /** Rebalancing suggestions */
  suggestions: RebalancingSuggestion[];
  /** Summary statistics */
  stats: CycleEnforcementStats;
  /** Generated warnings */
  warnings: string[];
}

/**
 * Statistics about cycle enforcement
 */
export interface CycleEnforcementStats {
  /** Total number of cycles (including partial) */
  totalCycles: number;
  /** Number of complete cycles */
  completeCycles: number;
  /** Average deviation from cycle targets */
  averageDeviation: number;
  /** Number of violations */
  violationCount: number;
  /** Percentage of chapters within tolerance */
  complianceRate: number;
}

/**
 * Configuration for cycle enforcement analysis
 */
export interface CycleEnforcementConfig {
  /** Tolerance for deviation before flagging as violation (default: 15) */
  deviationTolerance?: number;
  /** Whether to use actual tension (from analysis) over planned */
  preferActualTension?: boolean;
  /** Minor violation threshold (default: 10) */
  minorThreshold?: number;
  /** Moderate violation threshold (default: 20) */
  moderateThreshold?: number;
  /** Severe violation threshold (default: 30) */
  severeThreshold?: number;
}

/**
 * Default configuration for cycle enforcement
 */
export const DEFAULT_CYCLE_ENFORCEMENT_CONFIG: Required<CycleEnforcementConfig> = {
  deviationTolerance: 15,
  preferActualTension: true,
  minorThreshold: 10,
  moderateThreshold: 20,
  severeThreshold: 30,
};

/**
 * Default cycle tension pattern (5-chapter cycle)
 *
 * Position 0: Setup/recovery (40)
 * Position 1: Rising action (60)
 * Position 2: Escalation (70)
 * Position 3: Peak/climax (80)
 * Position 4: Resolution/breathing room (50)
 */
export const DEFAULT_CYCLE_PATTERN = [40, 60, 70, 80, 50];

/**
 * Phase descriptions for different cycle positions
 */
export const PHASE_DESCRIPTIONS: Record<number, string> = {
  0: 'setup',
  1: 'rising',
  2: 'escalating',
  3: 'peak',
  4: 'resolution',
};

/**
 * Get phase description for a cycle position
 *
 * @param position - Position within cycle (0-indexed)
 * @param targets - Array of tension targets for the cycle
 * @returns Phase description string
 */
export function getPhaseDescription(position: number, targets: number[]): string {
  // Find position of max tension in cycle
  const maxTension = Math.max(...targets);
  const peakPosition = targets.indexOf(maxTension);

  // Determine phase based on position relative to peak
  if (position === peakPosition) {
    return 'peak';
  }

  if (position < peakPosition) {
    const distanceFromPeak = peakPosition - position;
    if (distanceFromPeak === 1) {
      return 'escalating';
    }
    return 'rising';
  }

  // position > peakPosition
  const distanceFromPeak = position - peakPosition;
  if (distanceFromPeak === 1) {
    return 'falling';
  }
  return 'recovery';
}

/**
 * Calculate cycle position from global chapter position
 *
 * @param globalPosition - Chapter position (1-indexed)
 * @param cycleLength - Length of tension cycle
 * @returns Position within cycle (0-indexed)
 */
export function getCyclePosition(globalPosition: number, cycleLength: number): number {
  return (globalPosition - 1) % cycleLength;
}

/**
 * Calculate cycle number from global chapter position
 *
 * @param globalPosition - Chapter position (1-indexed)
 * @param cycleLength - Length of tension cycle
 * @returns Cycle number (1-indexed)
 */
export function getCycleNumber(globalPosition: number, cycleLength: number): number {
  return Math.floor((globalPosition - 1) / cycleLength) + 1;
}

/**
 * Get target tension for a given cycle position
 *
 * @param cyclePosition - Position within cycle (0-indexed)
 * @param cycleTensionTargets - Array of tension targets
 * @returns Target tension for that position
 */
export function getPositionTargetTension(
  cyclePosition: number,
  cycleTensionTargets: number[]
): number {
  if (cycleTensionTargets.length === 0) {
    return 50; // Default middle tension
  }
  return cycleTensionTargets[cyclePosition % cycleTensionTargets.length];
}

/**
 * Build position target map from serial settings
 *
 * @param settings - Serial settings with cycle configuration
 * @returns Map of position to target tension
 */
export function buildPositionTargetMap(settings: SerialSettings): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < settings.cycleLength; i++) {
    map.set(i, getPositionTargetTension(i, settings.cycleTensionTargets));
  }
  return map;
}

/**
 * Build cycle position configs from serial settings
 *
 * @param settings - Serial settings with cycle configuration
 * @returns Array of position configurations
 */
export function buildCyclePositionConfigs(settings: SerialSettings): CyclePositionConfig[] {
  const configs: CyclePositionConfig[] = [];

  for (let i = 0; i < settings.cycleLength; i++) {
    const targetTension = getPositionTargetTension(i, settings.cycleTensionTargets);
    const description = getPhaseDescription(i, settings.cycleTensionTargets);

    configs.push({
      position: i,
      targetTension,
      description,
    });
  }

  return configs;
}

/**
 * Extract cycle data points from structure and analyses
 *
 * @param rootStructure - Root structure (book or arc)
 * @param settings - Serial settings with cycle configuration
 * @param analyses - Content analyses indexed by structure ID
 * @returns Array of cycle data points
 */
export function extractCycleDataPoints(
  rootStructure: Structure,
  settings: SerialSettings,
  analyses: Map<string, ContentAnalysis>
): CycleDataPoint[] {
  const plannedPoints = extractPlannedTension(rootStructure);
  const dataPoints: CycleDataPoint[] = [];

  for (let i = 0; i < plannedPoints.length; i++) {
    const point = plannedPoints[i];
    const globalPosition = i + 1;
    const cyclePosition = getCyclePosition(globalPosition, settings.cycleLength);
    const cycleNumber = getCycleNumber(globalPosition, settings.cycleLength);
    const targetTension = getPositionTargetTension(cyclePosition, settings.cycleTensionTargets);

    // Get actual tension from analysis if available
    const analysis = analyses.get(point.structureId);
    const actualTension = analysis?.tensionScore?.score;

    // Calculate deviation using actual if available, otherwise planned
    const tensionValue = actualTension ?? point.tensionTarget;
    const deviationFromTarget =
      tensionValue !== undefined ? tensionValue - targetTension : undefined;

    dataPoints.push({
      structureId: point.structureId,
      title: point.title,
      globalPosition,
      cyclePosition,
      cycleNumber,
      targetTension,
      plannedTension: point.tensionTarget,
      actualTension,
      deviationFromTarget,
    });
  }

  return dataPoints;
}

/**
 * Detect current cycle phase
 *
 * @param totalChapters - Total number of chapters
 * @param settings - Serial settings
 * @returns Cycle phase information
 */
export function detectCyclePhase(
  totalChapters: number,
  settings: SerialSettings
): CyclePhaseResult {
  const cycleLength = settings.cycleLength;

  if (totalChapters === 0) {
    return {
      currentCycle: 1,
      currentPosition: 0,
      cycleLength,
      tensionTargets: settings.cycleTensionTargets,
      totalChapters: 0,
      chaptersInCurrentCycle: 0,
      isCycleComplete: false,
      phaseDescription: getPhaseDescription(0, settings.cycleTensionTargets),
      nextTargetTension: getPositionTargetTension(0, settings.cycleTensionTargets),
    };
  }

  const currentCycle = getCycleNumber(totalChapters, cycleLength);
  const currentPosition = getCyclePosition(totalChapters, cycleLength);
  const chaptersInCurrentCycle = currentPosition + 1;
  const isCycleComplete = chaptersInCurrentCycle === cycleLength;

  // Calculate next position
  const nextPosition = isCycleComplete ? 0 : currentPosition + 1;
  const nextTargetTension = getPositionTargetTension(nextPosition, settings.cycleTensionTargets);

  return {
    currentCycle,
    currentPosition,
    cycleLength,
    tensionTargets: settings.cycleTensionTargets,
    totalChapters,
    chaptersInCurrentCycle,
    isCycleComplete,
    phaseDescription: getPhaseDescription(currentPosition, settings.cycleTensionTargets),
    nextTargetTension,
  };
}

/**
 * Determine violation severity based on deviation
 */
function getViolationSeverity(
  deviation: number,
  config: Required<CycleEnforcementConfig>
): 'minor' | 'moderate' | 'severe' | null {
  const absDeviation = Math.abs(deviation);

  if (absDeviation < config.minorThreshold) {
    return null; // No violation
  } else if (absDeviation < config.moderateThreshold) {
    return 'minor';
  } else if (absDeviation < config.severeThreshold) {
    return 'moderate';
  }
  return 'severe';
}

/**
 * Detect cycle violations
 *
 * @param dataPoints - Cycle data points
 * @param config - Enforcement configuration
 * @returns Array of violations
 */
export function detectCycleViolations(
  dataPoints: CycleDataPoint[],
  config: CycleEnforcementConfig = {}
): CycleViolation[] {
  const mergedConfig = { ...DEFAULT_CYCLE_ENFORCEMENT_CONFIG, ...config };
  const violations: CycleViolation[] = [];

  for (const point of dataPoints) {
    // Determine which tension value to use
    const actualValue = mergedConfig.preferActualTension
      ? point.actualTension ?? point.plannedTension
      : point.plannedTension ?? point.actualTension;

    if (actualValue === undefined) {
      continue; // Can't evaluate without a tension value
    }

    const deviation = actualValue - point.targetTension;
    const severity = getViolationSeverity(deviation, mergedConfig);

    if (severity !== null) {
      violations.push({
        structureId: point.structureId,
        title: point.title,
        globalPosition: point.globalPosition,
        cyclePosition: point.cyclePosition,
        expectedTension: point.targetTension,
        actualValue,
        deviation,
        severity,
      });
    }
  }

  return violations;
}

/**
 * Generate rebalancing suggestions
 *
 * @param dataPoints - Cycle data points
 * @param violations - Detected violations
 * @param settings - Serial settings
 * @returns Array of suggestions
 */
export function generateRebalancingSuggestions(
  dataPoints: CycleDataPoint[],
  violations: CycleViolation[],
  settings: SerialSettings
): RebalancingSuggestion[] {
  const suggestions: RebalancingSuggestion[] = [];

  for (const violation of violations) {
    const direction = violation.deviation > 0 ? 'decrease' : 'increase';
    const priority =
      violation.severity === 'severe'
        ? 'high'
        : violation.severity === 'moderate'
          ? 'medium'
          : 'low';

    const phaseDesc = getPhaseDescription(violation.cyclePosition, settings.cycleTensionTargets);

    suggestions.push({
      structureId: violation.structureId,
      title: violation.title,
      currentTension: violation.actualValue,
      suggestedTension: violation.expectedTension,
      direction,
      priority,
      explanation:
        `Chapter "${violation.title}" is at cycle position ${violation.cyclePosition} (${phaseDesc} phase), ` +
        `which expects tension of ${violation.expectedTension}. ` +
        `Current tension is ${violation.actualValue} (${direction === 'increase' ? 'too low' : 'too high'} by ${Math.abs(violation.deviation)} points). ` +
        `Consider ${direction === 'increase' ? 'adding conflict or stakes' : 'adding breathing room or resolution'}.`,
    });
  }

  // Sort by priority (high first) then by position
  suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Find positions for secondary sort
    const aPoint = dataPoints.find((p) => p.structureId === a.structureId);
    const bPoint = dataPoints.find((p) => p.structureId === b.structureId);
    return (aPoint?.globalPosition ?? 0) - (bPoint?.globalPosition ?? 0);
  });

  return suggestions;
}

/**
 * Calculate cycle enforcement statistics
 */
function calculateCycleStats(
  dataPoints: CycleDataPoint[],
  violations: CycleViolation[],
  settings: SerialSettings,
  config: Required<CycleEnforcementConfig>
): CycleEnforcementStats {
  if (dataPoints.length === 0) {
    return {
      totalCycles: 0,
      completeCycles: 0,
      averageDeviation: 0,
      violationCount: 0,
      complianceRate: 100,
    };
  }

  const cycleLength = settings.cycleLength;
  const totalCycles = Math.ceil(dataPoints.length / cycleLength);
  const completeCycles = Math.floor(dataPoints.length / cycleLength);

  // Calculate average deviation
  const deviations = dataPoints
    .filter((p) => p.deviationFromTarget !== undefined)
    .map((p) => Math.abs(p.deviationFromTarget!));

  const averageDeviation =
    deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;

  // Calculate compliance rate
  const evaluatedPoints = dataPoints.filter(
    (p) => p.actualTension !== undefined || p.plannedTension !== undefined
  );
  const compliantPoints = evaluatedPoints.filter((p) => {
    const tension = p.actualTension ?? p.plannedTension;
    if (tension === undefined) return true;
    return Math.abs(tension - p.targetTension) < config.minorThreshold;
  });

  const complianceRate =
    evaluatedPoints.length > 0
      ? Math.round((compliantPoints.length / evaluatedPoints.length) * 100)
      : 100;

  return {
    totalCycles,
    completeCycles,
    averageDeviation: Math.round(averageDeviation * 10) / 10,
    violationCount: violations.length,
    complianceRate,
  };
}

/**
 * Generate cycle enforcement warnings
 */
export function generateCycleWarnings(
  dataPoints: CycleDataPoint[],
  violations: CycleViolation[],
  stats: CycleEnforcementStats,
  settings: SerialSettings
): string[] {
  const warnings: string[] = [];

  // Warn about severe violations
  const severeViolations = violations.filter((v) => v.severity === 'severe');
  if (severeViolations.length > 0) {
    warnings.push(
      `${severeViolations.length} chapter(s) have severe tension deviations from cycle targets. ` +
        `Review pacing to maintain rhythm.`
    );
  }

  // Warn about low compliance rate
  if (stats.complianceRate < 50) {
    warnings.push(
      `Only ${stats.complianceRate}% of chapters match cycle tension targets. ` +
        `The tension pattern may feel erratic to readers.`
    );
  }

  // Warn about consistently high/low tension
  const averagePlanned =
    dataPoints.filter((p) => p.plannedTension !== undefined).length > 0
      ? dataPoints
          .filter((p) => p.plannedTension !== undefined)
          .reduce((sum, p) => sum + p.plannedTension!, 0) /
        dataPoints.filter((p) => p.plannedTension !== undefined).length
      : 0;

  const averageTarget =
    dataPoints.length > 0
      ? dataPoints.reduce((sum, p) => sum + p.targetTension, 0) / dataPoints.length
      : 0;

  if (averagePlanned > 0 && averagePlanned > averageTarget + 15) {
    warnings.push(
      `Average planned tension (${Math.round(averagePlanned)}) is consistently higher than cycle targets (${Math.round(averageTarget)}). ` +
        `Consider adding more recovery chapters.`
    );
  } else if (averagePlanned > 0 && averagePlanned < averageTarget - 15) {
    warnings.push(
      `Average planned tension (${Math.round(averagePlanned)}) is consistently lower than cycle targets (${Math.round(averageTarget)}). ` +
        `Consider raising stakes in key chapters.`
    );
  }

  // Warn about missing tension values
  const missingTension = dataPoints.filter(
    (p) => p.plannedTension === undefined && p.actualTension === undefined
  );
  if (missingTension.length > dataPoints.length * 0.3 && dataPoints.length >= 5) {
    warnings.push(
      `${missingTension.length} chapter(s) have no tension targets set. ` +
        `Set tension targets to take advantage of cycle enforcement.`
    );
  }

  // Warn about incomplete cycles at peak positions
  const peakPosition = settings.cycleTensionTargets.indexOf(
    Math.max(...settings.cycleTensionTargets)
  );
  const lastPoint = dataPoints[dataPoints.length - 1];
  if (lastPoint && lastPoint.cyclePosition === peakPosition) {
    warnings.push(
      `Current cycle ends at peak tension position. ` +
        `Consider adding resolution chapters before starting new cycle.`
    );
  }

  return warnings;
}

/**
 * Main cycle enforcement analysis function
 *
 * Analyzes tension cycles across the structure and provides
 * comprehensive feedback on cycle adherence.
 *
 * @param rootStructure - Root structure (book or arc)
 * @param settings - Serial settings with cycle configuration
 * @param analyses - Content analyses indexed by structure ID
 * @param config - Enforcement configuration
 * @returns Complete cycle enforcement analysis
 */
export function analyzeCycleEnforcement(
  rootStructure: Structure,
  settings: SerialSettings,
  analyses: Map<string, ContentAnalysis> = new Map(),
  config: CycleEnforcementConfig = {}
): CycleEnforcementResult {
  const mergedConfig = { ...DEFAULT_CYCLE_ENFORCEMENT_CONFIG, ...config };

  // Extract data points
  const dataPoints = extractCycleDataPoints(rootStructure, settings, analyses);

  // Detect current phase
  const phaseInfo = detectCyclePhase(dataPoints.length, settings);

  // Detect violations
  const violations = detectCycleViolations(dataPoints, mergedConfig);

  // Generate suggestions
  const suggestions = generateRebalancingSuggestions(dataPoints, violations, settings);

  // Calculate stats
  const stats = calculateCycleStats(dataPoints, violations, settings, mergedConfig);

  // Generate warnings
  const warnings = generateCycleWarnings(dataPoints, violations, stats, settings);

  return {
    dataPoints,
    phaseInfo,
    violations,
    suggestions,
    stats,
    warnings,
  };
}

/**
 * Get suggested tension for next chapter
 *
 * Returns the target tension for the next chapter position in the cycle.
 *
 * @param currentChapterCount - Current number of chapters
 * @param settings - Serial settings
 * @returns Suggested tension and phase info
 */
export function suggestNextChapterTension(
  currentChapterCount: number,
  settings: SerialSettings
): {
  suggestedTension: number;
  cyclePosition: number;
  cycleNumber: number;
  phaseDescription: string;
} {
  const nextPosition = currentChapterCount + 1;
  const cyclePosition = getCyclePosition(nextPosition, settings.cycleLength);
  const cycleNumber = getCycleNumber(nextPosition, settings.cycleLength);
  const suggestedTension = getPositionTargetTension(cyclePosition, settings.cycleTensionTargets);
  const phaseDescription = getPhaseDescription(cyclePosition, settings.cycleTensionTargets);

  return {
    suggestedTension,
    cyclePosition,
    cycleNumber,
    phaseDescription,
  };
}

/**
 * Get cycle summary for display
 *
 * @param result - Cycle enforcement result
 * @param settings - Serial settings
 * @returns Human-readable summary
 */
export function getCycleSummary(
  result: CycleEnforcementResult,
  settings: SerialSettings
): string {
  const lines: string[] = [];

  lines.push(`Cycle Enforcement Summary (${result.dataPoints.length} chapters):`);
  lines.push(`  Cycle length: ${settings.cycleLength} chapters`);
  lines.push(
    `  Pattern: ${settings.cycleTensionTargets.map((t, i) => `pos${i}=${t}`).join(', ')}`
  );
  lines.push('');
  lines.push(`Current Phase:`);
  lines.push(`  Cycle ${result.phaseInfo.currentCycle}, position ${result.phaseInfo.currentPosition} (${result.phaseInfo.phaseDescription})`);
  lines.push(`  ${result.phaseInfo.chaptersInCurrentCycle}/${settings.cycleLength} chapters in current cycle`);

  if (result.phaseInfo.nextTargetTension !== undefined) {
    lines.push(`  Next chapter target: ${result.phaseInfo.nextTargetTension}`);
  }

  lines.push('');
  lines.push(`Statistics:`);
  lines.push(`  Complete cycles: ${result.stats.completeCycles}/${result.stats.totalCycles}`);
  lines.push(`  Compliance rate: ${result.stats.complianceRate}%`);
  lines.push(`  Average deviation: ${result.stats.averageDeviation}`);
  lines.push(`  Violations: ${result.stats.violationCount}`);

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
 * Validate cycle configuration
 *
 * @param settings - Serial settings to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateCycleConfiguration(settings: SerialSettings): string[] {
  const errors: string[] = [];

  if (settings.cycleLength < 1) {
    errors.push('Cycle length must be at least 1');
  }

  if (settings.cycleTensionTargets.length === 0) {
    errors.push('Cycle tension targets must have at least one value');
  }

  if (settings.cycleTensionTargets.length !== settings.cycleLength) {
    errors.push(
      `Cycle tension targets length (${settings.cycleTensionTargets.length}) must match cycle length (${settings.cycleLength})`
    );
  }

  for (let i = 0; i < settings.cycleTensionTargets.length; i++) {
    const target = settings.cycleTensionTargets[i];
    if (target < 0 || target > 100) {
      errors.push(`Cycle tension target at position ${i} (${target}) must be between 0 and 100`);
    }
  }

  return errors;
}

// ============================================================================
// High-level wrapper with Input/Dependencies pattern
// ============================================================================

/**
 * Input for cycle enforcement analysis
 */
export interface CycleEnforcementInput {
  /** Project ID */
  projectId: string;
  /** Root structure (book or arc) */
  rootStructure: Structure;
  /** Cycle configuration */
  cycleConfig: {
    cycleLength: number;
    tensionTargets: number[];
  };
}

/**
 * Dependencies for cycle enforcement
 */
export interface CycleEnforcementDependencies {
  /** Analysis repository for getting tension data */
  analysisRepository: AnalysisRepository;
  /** Content repository for getting content linked to structures */
  contentRepository: ContentRepository;
}

/**
 * Extract chapters and get their analyses
 */
function extractChaptersWithAnalysis(
  projectId: string,
  rootStructure: Structure,
  deps: CycleEnforcementDependencies
): Map<string, ContentAnalysis> {
  const analyses = new Map<string, ContentAnalysis>();

  function traverse(node: Structure): void {
    if (node.type === 'chapter') {
      const content = deps.contentRepository.findByStructure(projectId, node.id);
      if (content) {
        const analysis = deps.analysisRepository.findLatest(projectId, content.id);
        if (analysis) {
          analyses.set(node.id, analysis);
        }
      }
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
  return analyses;
}

/**
 * Analyze cycle enforcement with Input/Dependencies pattern
 *
 * This is the high-level wrapper function that:
 * 1. Gets analyses from the repository
 * 2. Builds serial settings from input
 * 3. Calls the core analysis function
 *
 * @param input - Cycle enforcement input
 * @param deps - Dependencies (repositories)
 * @returns Complete cycle enforcement result
 */
export function analyzeCycleEnforcementWithDeps(
  input: CycleEnforcementInput,
  deps: CycleEnforcementDependencies
): CycleEnforcementResult {
  // Get analyses for each chapter
  const analyses = extractChaptersWithAnalysis(
    input.projectId,
    input.rootStructure,
    deps
  );

  // Build serial settings from input
  const serialSettings: SerialSettings = {
    cycleLength: input.cycleConfig.cycleLength,
    cycleTensionTargets: input.cycleConfig.tensionTargets,
    minimumBuffer: 5,
    releaseInterval: 2,
    enforceHookVariety: true,
    maxConsecutiveSameHook: 2,
  };

  // Call the core analysis function
  return analyzeCycleEnforcement(
    input.rootStructure,
    serialSettings,
    analyses
  );
}
