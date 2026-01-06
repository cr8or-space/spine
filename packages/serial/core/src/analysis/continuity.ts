/**
 * Continuity checking service
 *
 * Provides utilities for:
 * - Tracking continuity issues across content
 * - Detecting patterns in continuity errors
 * - Generating continuity recommendations
 * - Monitoring continuity health over time
 *
 * Phase 2.2 implementation - analysis/continuity.ts
 */

import type {
  Content,
  ContentAnalysis,
  ContinuityIssue,
  Structure,
} from '@repo/serial-types';

import type { AnalysisRepository } from './repository';
import type { ContentRepository } from '../storage/repositories';
import type { CharacterMention, LocationMention } from './types';

/**
 * Input for continuity analysis operations
 */
export interface ContinuityAnalysisInput {
  /** Project ID */
  projectId: string;
  /** Root structure to analyze */
  rootStructure: Structure;
}

/**
 * Dependencies for continuity analysis
 */
export interface ContinuityAnalysisDependencies {
  /** Analysis repository for stored results */
  analysisRepository: AnalysisRepository;
  /** Content repository for content lookup */
  contentRepository: ContentRepository;
}

/**
 * Configuration for continuity analysis
 */
export interface ContinuityConfig {
  /** Threshold for high issue count warning */
  highIssueThreshold?: number;
  /** Threshold for critical severity issues requiring attention */
  criticalThreshold?: number;
  /** Whether to include reviewed issues in counts */
  includeReviewed?: boolean;
  /** Whether to include false positives in counts */
  includeFalsePositives?: boolean;
}

/**
 * Default continuity configuration
 */
export const DEFAULT_CONTINUITY_CONFIG: Required<ContinuityConfig> = {
  highIssueThreshold: 5,
  criticalThreshold: 2,
  includeReviewed: false,
  includeFalsePositives: false,
};

/**
 * Continuity issue types
 */
export type IssueType =
  | 'character-inconsistency'
  | 'location-error'
  | 'timeline-conflict'
  | 'fact-contradiction'
  | 'world-rule-violation'
  | 'character-voice'
  | 'relationship-error'
  | 'other';

/**
 * Issue severity levels
 */
export type IssueSeverity = 'critical' | 'major' | 'minor' | 'nitpick';

/**
 * Severity levels for continuity warnings
 */
export type ContinuityWarningSeverity = 'critical' | 'warning' | 'info';

/**
 * A continuity warning
 */
export interface ContinuityWarning {
  /** Type of warning */
  type:
    | 'high-issue-count'
    | 'critical-issues'
    | 'unreviewed-issues'
    | 'recurring-pattern'
    | 'missing-analysis';
  /** Severity of the warning */
  severity: ContinuityWarningSeverity;
  /** Warning message */
  message: string;
  /** Affected structure IDs */
  affectedStructures: string[];
  /** Related issue IDs */
  relatedIssues?: string[];
  /** Suggested action */
  suggestion?: string;
}

/**
 * Continuity data for a single chapter
 */
export interface ChapterContinuityData {
  /** Structure ID */
  structureId: string;
  /** Chapter title */
  title: string;
  /** Chapter position (1-indexed) */
  position: number;
  /** All continuity issues */
  issues: ContinuityIssue[];
  /** Issue count by severity */
  issueCounts: Record<IssueSeverity, number>;
  /** Issue count by type */
  issuesByType: Record<IssueType, number>;
  /** Characters mentioned */
  characterMentions: CharacterMention[];
  /** Locations mentioned */
  locationMentions: LocationMention[];
  /** Continuity score (0-100, higher = fewer issues) */
  continuityScore?: number;
  /** Whether content exists */
  hasContent: boolean;
  /** Whether continuity analysis exists */
  hasAnalysis: boolean;
  /** Content ID if exists */
  contentId?: string;
}

/**
 * Issue distribution by type
 */
export interface IssueTypeDistribution {
  /** Total issues */
  total: number;
  /** Count per issue type */
  distribution: Record<IssueType, number>;
  /** Most common issue type */
  mostCommon: IssueType | 'none';
  /** Types with no issues */
  noIssues: IssueType[];
}

/**
 * Issue distribution by severity
 */
export interface IssueSeverityDistribution {
  /** Total issues */
  total: number;
  /** Count per severity */
  distribution: Record<IssueSeverity, number>;
  /** Percentage per severity */
  percentages: Record<IssueSeverity, number>;
}

/**
 * Recurring issue pattern
 */
export interface RecurringPattern {
  /** Pattern type */
  type: IssueType;
  /** Description of the pattern */
  description: string;
  /** Number of occurrences */
  occurrences: number;
  /** Affected structure IDs */
  affectedStructures: string[];
  /** Related entity IDs (characters, locations, etc.) */
  relatedEntities: string[];
}

/**
 * Entity-specific issue summary
 */
export interface EntityIssueSummary {
  /** Entity ID */
  entityId: string;
  /** Entity name */
  entityName: string;
  /** Entity type (character, location, etc.) */
  entityType: string;
  /** Number of issues involving this entity */
  issueCount: number;
  /** Issue types for this entity */
  issueTypes: IssueType[];
  /** Affected structures */
  affectedStructures: string[];
}

/**
 * A recommendation for fixing continuity
 */
export interface ContinuityRecommendation {
  /** Recommendation type */
  type: 'fix-critical' | 'review-issues' | 'update-bible' | 'analyze';
  /** Priority (1 = highest) */
  priority: number;
  /** Recommendation message */
  message: string;
  /** Affected structures */
  affectedStructures: string[];
  /** Related issues */
  relatedIssues: string[];
  /** Suggested actions */
  actions: string[];
}

/**
 * Summary of continuity analysis for a structure
 */
export interface ContinuitySummary {
  /** Structure being analyzed */
  structureId: string;
  /** Structure title */
  title: string;
  /** Overall continuity score (0-100) */
  overallScore: number;
  /** Total issues found */
  totalIssues: number;
  /** Unreviewed issues */
  unreviewedIssues: number;
  /** Number of chapters analyzed */
  chaptersAnalyzed: number;
  /** Total chapters */
  totalChapters: number;
  /** Issue distribution by type */
  typeDistribution: IssueTypeDistribution;
  /** Issue distribution by severity */
  severityDistribution: IssueSeverityDistribution;
  /** Recurring patterns detected */
  patterns: RecurringPattern[];
  /** Entity-specific summaries */
  entitySummaries: EntityIssueSummary[];
  /** Active warnings */
  warnings: ContinuityWarning[];
}

/**
 * Result of comprehensive continuity analysis
 */
export interface ContinuityAnalysisReport {
  /** Summary for the root structure */
  summary: ContinuitySummary;
  /** Per-chapter data */
  chapterData: ChapterContinuityData[];
  /** All issues across structure */
  allIssues: ContinuityIssue[];
  /** All warnings */
  warnings: ContinuityWarning[];
  /** Recommendations for improvement */
  recommendations: ContinuityRecommendation[];
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
 * Filter issues based on config
 */
function filterIssues(
  issues: ContinuityIssue[],
  config: Required<ContinuityConfig>
): ContinuityIssue[] {
  return issues.filter((issue) => {
    if (!config.includeReviewed && issue.reviewed) return false;
    if (!config.includeFalsePositives && issue.falsePositive) return false;
    return true;
  });
}

/**
 * Count issues by severity
 */
function countBySeverity(issues: ContinuityIssue[]): Record<IssueSeverity, number> {
  const counts: Record<IssueSeverity, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    nitpick: 0,
  };

  for (const issue of issues) {
    counts[issue.severity]++;
  }

  return counts;
}

/**
 * Count issues by type
 */
function countByType(issues: ContinuityIssue[]): Record<IssueType, number> {
  const counts: Record<IssueType, number> = {
    'character-inconsistency': 0,
    'location-error': 0,
    'timeline-conflict': 0,
    'fact-contradiction': 0,
    'world-rule-violation': 0,
    'character-voice': 0,
    'relationship-error': 0,
    'other': 0,
  };

  for (const issue of issues) {
    const type = issue.type as IssueType;
    if (type in counts) {
      counts[type]++;
    } else {
      counts['other']++;
    }
  }

  return counts;
}

/**
 * Get content and analysis for a chapter
 */
function getChapterData(
  projectId: string,
  chapter: Structure,
  deps: ContinuityAnalysisDependencies
): { content?: Content; analysis?: ContentAnalysis } {
  const content = deps.contentRepository.findByStructure(projectId, chapter.id);
  let analysis: ContentAnalysis | undefined;

  if (content) {
    analysis = deps.analysisRepository.findLatest(projectId, content.id);
  }

  return { content, analysis };
}

/**
 * Build chapter continuity data for a single chapter
 */
function buildChapterData(
  chapter: Structure,
  position: number,
  data: { content?: Content; analysis?: ContentAnalysis },
  config: Required<ContinuityConfig>
): ChapterContinuityData {
  const allIssues = data.analysis?.continuityIssues || [];
  const issues = filterIssues(allIssues, config);

  // Extract character and location mentions from issue data
  const characterMentions: CharacterMention[] = [];
  const locationMentions: LocationMention[] = [];

  // Build from character appearances in analysis
  const charAppearances = data.analysis?.characterAppearances || [];
  for (const appearance of charAppearances) {
    characterMentions.push({
      characterId: appearance.characterId,
      characterName: '', // Would need bible lookup
      appearanceType: appearance.type as 'mention' | 'scene' | 'pov',
      dialogueLines: appearance.dialogueLines ?? 0,
      consistent: true, // Assume consistent unless there's an issue
    });
  }

  // Build from location appearances
  const locAppearances = data.analysis?.locationAppearances || [];
  for (const locId of locAppearances) {
    locationMentions.push({
      locationId: locId,
      locationName: '', // Would need bible lookup
      consistent: true,
    });
  }

  // Calculate continuity score (inverse of issue severity)
  let continuityScore: number | undefined;
  if (data.analysis) {
    const severityCounts = countBySeverity(issues);
    // Weight: critical=10, major=5, minor=2, nitpick=1
    const weightedSum =
      severityCounts.critical * 10 +
      severityCounts.major * 5 +
      severityCounts.minor * 2 +
      severityCounts.nitpick * 1;

    // Score decreases with issues, min 0
    continuityScore = Math.max(0, 100 - weightedSum * 3);
  }

  return {
    structureId: chapter.id,
    title: chapter.title,
    position,
    issues,
    issueCounts: countBySeverity(issues),
    issuesByType: countByType(issues),
    characterMentions,
    locationMentions,
    continuityScore,
    hasContent: data.content !== undefined,
    hasAnalysis: data.analysis !== undefined,
    contentId: data.content?.id,
  };
}

/**
 * Calculate issue type distribution
 */
export function calculateTypeDistribution(
  issues: ContinuityIssue[]
): IssueTypeDistribution {
  const counts = countByType(issues);
  const total = issues.length;

  let mostCommon: IssueType | 'none' = 'none';
  let maxCount = 0;

  const issueTypes: IssueType[] = [
    'character-inconsistency',
    'location-error',
    'timeline-conflict',
    'fact-contradiction',
    'world-rule-violation',
    'character-voice',
    'relationship-error',
    'other',
  ];

  for (const type of issueTypes) {
    if (counts[type] > maxCount) {
      maxCount = counts[type];
      mostCommon = type;
    }
  }

  const noIssues = issueTypes.filter((type) => counts[type] === 0);

  return {
    total,
    distribution: counts,
    mostCommon: total > 0 ? mostCommon : 'none',
    noIssues,
  };
}

/**
 * Calculate issue severity distribution
 */
export function calculateSeverityDistribution(
  issues: ContinuityIssue[]
): IssueSeverityDistribution {
  const counts = countBySeverity(issues);
  const total = issues.length;

  const percentages: Record<IssueSeverity, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    nitpick: 0,
  };

  if (total > 0) {
    for (const severity of Object.keys(counts) as IssueSeverity[]) {
      percentages[severity] = (counts[severity] / total) * 100;
    }
  }

  return {
    total,
    distribution: counts,
    percentages,
  };
}

/**
 * Detect recurring issue patterns
 */
export function detectRecurringPatterns(
  chapterData: ChapterContinuityData[]
): RecurringPattern[] {
  const patterns: RecurringPattern[] = [];

  // Group issues by entity
  const entityIssues = new Map<
    string,
    { type: IssueType; structures: Set<string>; entities: Set<string> }
  >();

  for (const chapter of chapterData) {
    for (const issue of chapter.issues) {
      const entityId = issue.conflictsWith.id;
      const key = `${issue.type}-${entityId}`;

      if (!entityIssues.has(key)) {
        entityIssues.set(key, {
          type: issue.type as IssueType,
          structures: new Set(),
          entities: new Set(),
        });
      }

      const entry = entityIssues.get(key)!;
      entry.structures.add(chapter.structureId);
      entry.entities.add(entityId);
    }
  }

  // Find patterns with multiple occurrences
  for (const [, data] of entityIssues) {
    if (data.structures.size >= 2) {
      patterns.push({
        type: data.type,
        description: `Recurring ${data.type} issues across ${data.structures.size} chapters`,
        occurrences: data.structures.size,
        affectedStructures: Array.from(data.structures),
        relatedEntities: Array.from(data.entities),
      });
    }
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Build entity issue summaries
 */
export function buildEntitySummaries(
  issues: ContinuityIssue[],
  chapterData: ChapterContinuityData[]
): EntityIssueSummary[] {
  const entityMap = new Map<
    string,
    {
      entityType: string;
      issueTypes: Set<IssueType>;
      structures: Set<string>;
    }
  >();

  for (const chapter of chapterData) {
    for (const issue of chapter.issues) {
      const entityId = issue.conflictsWith.id;
      const entityType = issue.conflictsWith.type;

      if (!entityMap.has(entityId)) {
        entityMap.set(entityId, {
          entityType,
          issueTypes: new Set(),
          structures: new Set(),
        });
      }

      const entry = entityMap.get(entityId)!;
      entry.issueTypes.add(issue.type as IssueType);
      entry.structures.add(chapter.structureId);
    }
  }

  const summaries: EntityIssueSummary[] = [];

  for (const [entityId, data] of entityMap) {
    const relevantIssues = issues.filter((i) => i.conflictsWith.id === entityId);

    summaries.push({
      entityId,
      entityName: entityId, // Would need bible lookup for actual name
      entityType: data.entityType,
      issueCount: relevantIssues.length,
      issueTypes: Array.from(data.issueTypes),
      affectedStructures: Array.from(data.structures),
    });
  }

  return summaries.sort((a, b) => b.issueCount - a.issueCount);
}

/**
 * Generate continuity warnings
 */
export function generateContinuityWarnings(
  chapterData: ChapterContinuityData[],
  allIssues: ContinuityIssue[],
  _typeDistribution: IssueTypeDistribution,
  severityDistribution: IssueSeverityDistribution,
  patterns: RecurringPattern[],
  config: Required<ContinuityConfig>
): ContinuityWarning[] {
  const warnings: ContinuityWarning[] = [];

  // High issue count warning
  const highIssueChapters = chapterData.filter(
    (c) => c.issues.length >= config.highIssueThreshold
  );
  if (highIssueChapters.length > 0) {
    warnings.push({
      type: 'high-issue-count',
      severity: 'warning',
      message: `${highIssueChapters.length} chapter(s) have ${config.highIssueThreshold}+ continuity issues`,
      affectedStructures: highIssueChapters.map((c) => c.structureId),
      suggestion: 'Review and address continuity issues in these chapters',
    });
  }

  // Critical issues warning
  if (severityDistribution.distribution.critical >= config.criticalThreshold) {
    const criticalIssues = allIssues.filter((i) => i.severity === 'critical');
    warnings.push({
      type: 'critical-issues',
      severity: 'critical',
      message: `${severityDistribution.distribution.critical} critical continuity issue(s) need immediate attention`,
      affectedStructures: [
        ...new Set(
          chapterData.filter((c) => c.issueCounts.critical > 0).map((c) => c.structureId)
        ),
      ],
      relatedIssues: criticalIssues.map((i) => i.id),
      suggestion: 'Fix critical issues before publishing',
    });
  }

  // Unreviewed issues
  const unreviewedCount = allIssues.filter((i) => !i.reviewed).length;
  if (unreviewedCount > 0) {
    warnings.push({
      type: 'unreviewed-issues',
      severity: unreviewedCount > 10 ? 'warning' : 'info',
      message: `${unreviewedCount} continuity issue(s) pending review`,
      affectedStructures: [],
      suggestion: 'Review issues to confirm or mark as false positives',
    });
  }

  // Recurring patterns
  for (const pattern of patterns.slice(0, 3)) {
    // Top 3 patterns
    warnings.push({
      type: 'recurring-pattern',
      severity: pattern.occurrences > 3 ? 'warning' : 'info',
      message: `Recurring "${pattern.type}" pattern across ${pattern.occurrences} chapters`,
      affectedStructures: pattern.affectedStructures,
      suggestion: 'Update story bible to resolve recurring issues',
    });
  }

  // Missing analysis
  const missingAnalysis = chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
  if (missingAnalysis.length > 0) {
    warnings.push({
      type: 'missing-analysis',
      severity: 'info',
      message: `${missingAnalysis.length} chapter(s) need continuity analysis`,
      affectedStructures: missingAnalysis.map((c) => c.structureId),
      suggestion: 'Run analysis on these chapters',
    });
  }

  return warnings;
}

/**
 * Generate recommendations based on analysis
 */
export function generateContinuityRecommendations(
  _chapterData: ChapterContinuityData[],
  allIssues: ContinuityIssue[],
  warnings: ContinuityWarning[],
  entitySummaries: EntityIssueSummary[]
): ContinuityRecommendation[] {
  const recommendations: ContinuityRecommendation[] = [];

  // Fix critical issues
  const criticalWarning = warnings.find((w) => w.type === 'critical-issues');
  if (criticalWarning) {
    recommendations.push({
      type: 'fix-critical',
      priority: 1,
      message: 'Address critical continuity issues immediately',
      affectedStructures: criticalWarning.affectedStructures,
      relatedIssues: criticalWarning.relatedIssues || [],
      actions: [
        'Review each critical issue',
        'Update content to resolve contradictions',
        'Update story bible if needed',
      ],
    });
  }

  // Review pending issues
  const unreviewedWarning = warnings.find((w) => w.type === 'unreviewed-issues');
  if (unreviewedWarning) {
    recommendations.push({
      type: 'review-issues',
      priority: 2,
      message: 'Review pending continuity issues',
      affectedStructures: [],
      relatedIssues: allIssues.filter((i) => !i.reviewed).map((i) => i.id),
      actions: [
        'Review each flagged issue',
        'Mark false positives',
        'Fix genuine issues',
      ],
    });
  }

  // Update bible for recurring patterns
  const patternWarnings = warnings.filter((w) => w.type === 'recurring-pattern');
  if (patternWarnings.length > 0) {
    const affectedEntities = entitySummaries
      .filter((e) => e.issueCount >= 2)
      .map((e) => e.entityId);

    recommendations.push({
      type: 'update-bible',
      priority: 3,
      message: 'Update story bible to prevent recurring issues',
      affectedStructures: [],
      relatedIssues: allIssues
        .filter((i) => affectedEntities.includes(i.conflictsWith.id))
        .map((i) => i.id),
      actions: [
        'Review entity definitions in bible',
        'Add missing details or clarifications',
        'Document any intentional changes',
      ],
    });
  }

  // Run analysis on missing chapters
  const analysisWarning = warnings.find((w) => w.type === 'missing-analysis');
  if (analysisWarning) {
    recommendations.push({
      type: 'analyze',
      priority: 4,
      message: 'Complete continuity analysis for all chapters',
      affectedStructures: analysisWarning.affectedStructures,
      relatedIssues: [],
      actions: ['Run analysis on chapters without continuity data'],
    });
  }

  return recommendations.sort((a, b) => a.priority - b.priority);
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Generate comprehensive continuity analysis report
 *
 * Analyzes continuity across an entire structure tree, producing
 * warnings, patterns, and recommendations.
 */
export function analyzeContinuity(
  input: ContinuityAnalysisInput,
  deps: ContinuityAnalysisDependencies,
  config?: ContinuityConfig
): ContinuityAnalysisReport {
  const mergedConfig = { ...DEFAULT_CONTINUITY_CONFIG, ...config };

  // Collect all chapters
  const chapters = collectChapters(input.rootStructure);

  // Build chapter data
  const chapterData: ChapterContinuityData[] = chapters.map((chapter, index) => {
    const data = getChapterData(input.projectId, chapter, deps);
    return buildChapterData(chapter, index + 1, data, mergedConfig);
  });

  // Collect all issues
  const allIssues = chapterData.flatMap((c) => c.issues);

  // Calculate distributions
  const typeDistribution = calculateTypeDistribution(allIssues);
  const severityDistribution = calculateSeverityDistribution(allIssues);

  // Detect patterns
  const patterns = detectRecurringPatterns(chapterData);

  // Build entity summaries
  const entitySummaries = buildEntitySummaries(allIssues, chapterData);

  // Generate warnings
  const warnings = generateContinuityWarnings(
    chapterData,
    allIssues,
    typeDistribution,
    severityDistribution,
    patterns,
    mergedConfig
  );

  // Generate recommendations
  const recommendations = generateContinuityRecommendations(
    chapterData,
    allIssues,
    warnings,
    entitySummaries
  );

  // Calculate overall score
  const analyzedChapters = chapterData.filter((c) => c.hasAnalysis);
  const unreviewedIssues = allIssues.filter((i) => !i.reviewed).length;

  let overallScore = 100;
  if (analyzedChapters.length > 0) {
    const scores = analyzedChapters
      .filter((c) => c.continuityScore !== undefined)
      .map((c) => c.continuityScore!);
    if (scores.length > 0) {
      overallScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    }
  }

  const summary: ContinuitySummary = {
    structureId: input.rootStructure.id,
    title: input.rootStructure.title,
    overallScore,
    totalIssues: allIssues.length,
    unreviewedIssues,
    chaptersAnalyzed: analyzedChapters.length,
    totalChapters: chapterData.length,
    typeDistribution,
    severityDistribution,
    patterns,
    entitySummaries,
    warnings,
  };

  return {
    summary,
    chapterData,
    allIssues,
    warnings,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Analyze continuity with explicit dependency injection
 */
export function analyzeContinuityWithDeps(
  input: ContinuityAnalysisInput,
  deps: ContinuityAnalysisDependencies,
  config?: ContinuityConfig
): ContinuityAnalysisReport {
  return analyzeContinuity(input, deps, config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get chapters with continuity issues
 */
export function getChaptersWithIssues(
  report: ContinuityAnalysisReport
): ChapterContinuityData[] {
  return report.chapterData.filter((c) => c.issues.length > 0);
}

/**
 * Get chapters with critical issues
 */
export function getChaptersWithCriticalIssues(
  report: ContinuityAnalysisReport
): ChapterContinuityData[] {
  return report.chapterData.filter((c) => c.issueCounts.critical > 0);
}

/**
 * Get issues by severity
 */
export function getIssuesBySeverity(
  report: ContinuityAnalysisReport,
  severity: IssueSeverity
): ContinuityIssue[] {
  return report.allIssues.filter((i) => i.severity === severity);
}

/**
 * Get issues by type
 */
export function getIssuesByType(
  report: ContinuityAnalysisReport,
  type: IssueType
): ContinuityIssue[] {
  return report.allIssues.filter((i) => i.type === type);
}

/**
 * Get unreviewed issues
 */
export function getUnreviewedIssues(
  report: ContinuityAnalysisReport
): ContinuityIssue[] {
  return report.allIssues.filter((i) => !i.reviewed);
}

/**
 * Get chapters missing continuity analysis
 */
export function getUnanalyzedChapters(
  report: ContinuityAnalysisReport
): ChapterContinuityData[] {
  return report.chapterData.filter((c) => c.hasContent && !c.hasAnalysis);
}

/**
 * Check if continuity needs attention
 */
export function continuityNeedsAttention(report: ContinuityAnalysisReport): boolean {
  return report.warnings.some((w) => w.severity === 'critical' || w.severity === 'warning');
}

/**
 * Get analysis completion percentage
 */
export function getContinuityAnalysisCompletion(report: ContinuityAnalysisReport): number {
  const withContent = report.chapterData.filter((c) => c.hasContent);
  if (withContent.length === 0) return 0;
  const analyzed = withContent.filter((c) => c.hasAnalysis);
  return (analyzed.length / withContent.length) * 100;
}

/**
 * Get issue summary by severity
 */
export function getIssueSummaryBySeverity(
  report: ContinuityAnalysisReport
): Array<{ severity: IssueSeverity; count: number; percentage: number }> {
  const severities: IssueSeverity[] = ['critical', 'major', 'minor', 'nitpick'];

  return severities.map((severity) => ({
    severity,
    count: report.summary.severityDistribution.distribution[severity],
    percentage: report.summary.severityDistribution.percentages[severity],
  }));
}

/**
 * Get entities with most issues
 */
export function getProblematicEntities(
  report: ContinuityAnalysisReport,
  limit: number = 5
): EntityIssueSummary[] {
  return report.summary.entitySummaries.slice(0, limit);
}

/**
 * Calculate issue resolution rate
 */
export function getIssueResolutionRate(report: ContinuityAnalysisReport): number {
  const total = report.allIssues.length;
  if (total === 0) return 100;

  const resolved = report.allIssues.filter((i) => i.reviewed).length;
  return (resolved / total) * 100;
}
