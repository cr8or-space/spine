import { z } from 'zod';

import { IdSchema, TimestampSchema } from '@repo/framework-types';

import {
  CharacterArcTypeSchema,
  CharacterRoleSchema,
  PlotThreadScopeSchema,
  PlotThreadStatusSchema,
  PlotThreadTypeSchema,
  PromisePayoffSchema,
  PromiseStatusSchema,
  RelationshipTypeSchema,
} from './shared';

// Re-export for convenience (these are also exported from their canonical sources)
export {
  CharacterArcTypeSchema,
  CharacterRoleSchema,
  PlotThreadScopeSchema,
  PlotThreadStatusSchema,
  PromisePayoffSchema,
  PromiseStatusSchema,
  RelationshipTypeSchema,
};

// ============================================================================
// Core Enums (defined early for reuse within this file)
// ============================================================================

/**
 * Presence type for character appearances in content.
 * - mention: Character is mentioned but not present
 * - scene: Character appears in a scene
 * - pov: Chapter/scene is from this character's point of view
 */
export const PresenceTypeSchema = z.enum(['mention', 'scene', 'pov']);
export type PresenceType = z.infer<typeof PresenceTypeSchema>;

/**
 * Touch type for plot thread interactions.
 * Tracks how a thread progresses through the narrative.
 */
export const ThreadTouchTypeSchema = z.enum([
  'introduction',
  'development',
  'complication',
  'climax',
  'resolution',
]);
export type ThreadTouchType = z.infer<typeof ThreadTouchTypeSchema>;

/**
 * Continuity issue type - what kind of continuity problem was detected.
 */
export const ContinuityIssueTypeSchema = z.enum([
  'character-inconsistency',
  'location-error',
  'timeline-conflict',
  'fact-contradiction',
  'world-rule-violation',
  'character-voice',
  'relationship-error',
  'other',
]);
export type ContinuityIssueType = z.infer<typeof ContinuityIssueTypeSchema>;

/**
 * Continuity issue severity.
 */
export const ContinuityIssueSeveritySchema = z.enum([
  'critical',
  'major',
  'minor',
  'nitpick',
]);
export type ContinuityIssueSeverity = z.infer<typeof ContinuityIssueSeveritySchema>;

/**
 * Entity type that a continuity issue conflicts with.
 */
export const ConflictEntityTypeSchema = z.enum([
  'character',
  'location',
  'world-rule',
  'content',
  'timeline-event',
]);
export type ConflictEntityType = z.infer<typeof ConflictEntityTypeSchema>;

/**
 * Hook type for analysis - includes 'none' for cases where no hook was detected.
 * Based on HookTypeSchema from structure.ts but extended for analysis purposes.
 */
export const AnalysisHookTypeSchema = z.enum([
  'revelation',
  'decision',
  'cliffhanger',
  'emotional',
  'question',
  'twist',
  'promise',
  'none',
]);
export type AnalysisHookType = z.infer<typeof AnalysisHookTypeSchema>;

/**
 * Hook type for pattern analysis - excludes 'none' since patterns only track actual hooks.
 */
export const PatternHookTypeSchema = z.enum([
  'revelation',
  'decision',
  'cliffhanger',
  'emotional',
  'question',
  'twist',
  'promise',
]);
export type PatternHookType = z.infer<typeof PatternHookTypeSchema>;

// ============================================================================
// Content Analysis Types
// ============================================================================

/**
 * Continuity issue detected in content
 */
export const ContinuityIssueSchema = z.object({
  id: IdSchema,
  /** Type of continuity problem */
  type: ContinuityIssueTypeSchema,
  /** Severity of the issue */
  severity: ContinuityIssueSeveritySchema,
  description: z.string().min(1),
  /** Location in content where issue occurs */
  location: z.object({
    paragraphIndex: z.number().int().min(0).optional(),
    startOffset: z.number().int().min(0).optional(),
    endOffset: z.number().int().min(0).optional(),
  }),
  /** Reference to conflicting bible entry or content */
  conflictsWith: z.object({
    type: ConflictEntityTypeSchema,
    id: IdSchema,
    detail: z.string().optional(),
  }),
  /** Suggested fix */
  suggestion: z.string().optional(),
  /** Whether this issue has been reviewed */
  reviewed: z.boolean(),
  /** Whether this was marked as false positive */
  falsePositive: z.boolean(),
});
export type ContinuityIssue = z.infer<typeof ContinuityIssueSchema>;

/**
 * Score with explanation (for LLM-generated scores)
 */
export const ExplainedScoreSchema = z.object({
  score: z.number().min(0).max(100),
  explanation: z.string(),
  /** Factors that contributed to this score */
  factors: z
    .array(
      z.object({
        name: z.string(),
        impact: z.number(), // positive or negative
        detail: z.string().optional(),
      })
    )
    .optional(),
});
export type ExplainedScore = z.infer<typeof ExplainedScoreSchema>;

/**
 * Content analysis results
 *
 * Analysis is performed by the LLM and stored for visualization
 * and review workflows.
 */
export const ContentAnalysisSchema = z.object({
  id: IdSchema,
  contentId: IdSchema,
  contentVersion: z.number().int().positive(),
  /** Overall tension level (0-100) */
  tensionScore: ExplainedScoreSchema,
  /** How compelling is the ending hook (0-100) */
  hookStrength: ExplainedScoreSchema.optional(),
  /** Reading pace/engagement (0-100) */
  paceScore: ExplainedScoreSchema,
  /** Per-character voice consistency scores */
  characterVoiceScores: z.record(IdSchema, ExplainedScoreSchema),
  /** Detected continuity issues */
  continuityIssues: z.array(ContinuityIssueSchema),
  /** Word count */
  wordCount: z.number().int().min(0),
  /** Estimated reading time in minutes */
  readingTime: z.number().min(0),
  /** Characters that appear in this content */
  characterAppearances: z.array(
    z.object({
      characterId: IdSchema,
      type: PresenceTypeSchema,
      dialogueLines: z.number().int().min(0).optional(),
    })
  ),
  /** Locations featured in this content */
  locationAppearances: z.array(IdSchema),
  /** Plot threads touched */
  threadTouches: z.array(
    z.object({
      threadId: IdSchema,
      type: ThreadTouchTypeSchema,
    })
  ),
  /** When this analysis was performed */
  analyzedAt: TimestampSchema,
  /** Model used for analysis */
  modelId: z.string().optional(),
});
export type ContentAnalysis = z.infer<typeof ContentAnalysisSchema>;

/**
 * Aggregated analysis for a structure (chapter, arc, book)
 */
export const AggregatedAnalysisSchema = z.object({
  structureId: IdSchema,
  /** Average tension across children */
  averageTension: z.number().min(0).max(100),
  /** Planned vs actual tension divergence */
  tensionDivergence: z.number(),
  /** Total word count */
  totalWordCount: z.number().int().min(0),
  /** Total reading time */
  totalReadingTime: z.number().min(0),
  /** Unresolved continuity issues count by severity */
  issuesBySeverity: z.object({
    critical: z.number().int().min(0),
    major: z.number().int().min(0),
    minor: z.number().int().min(0),
    nitpick: z.number().int().min(0),
  }),
  /** Character presence across children */
  characterPresence: z.record(
    IdSchema,
    z.object({
      appearances: z.number().int().min(0),
      povChapters: z.number().int().min(0),
    })
  ),
  /** Plot thread status */
  threadStatus: z.record(
    IdSchema,
    z.object({
      touches: z.number().int().min(0),
      lastTouchType: ThreadTouchTypeSchema,
    })
  ),
  calculatedAt: TimestampSchema,
});
export type AggregatedAnalysis = z.infer<typeof AggregatedAnalysisSchema>;

/**
 * Hook pattern analysis for web serial management
 */
export const HookPatternAnalysisSchema = z.object({
  /** Recent hook types used */
  recentHooks: z.array(
    z.object({
      contentId: IdSchema,
      hookType: PatternHookTypeSchema,
      strength: z.number().min(0).max(100),
    })
  ),
  /** Distribution of hook types */
  distribution: z.record(z.string(), z.number()),
  /** Variety score (higher = more varied) */
  varietyScore: z.number().min(0).max(100),
  /** Warnings about patterns */
  warnings: z.array(z.string()),
});
export type HookPatternAnalysis = z.infer<typeof HookPatternAnalysisSchema>;

/**
 * Content status for tension curve data points
 */
const ContentStatusForCurveSchema = z.enum([
  'draft',
  'review',
  'approved',
  'published',
]);

/**
 * A single data point in the tension curve
 *
 * Combines planned tension (from structure) with actual tension
 * (from content analysis) for a chapter or scene.
 */
export const TensionCurveDataPointSchema = z.object({
  /** Structure ID (chapter or scene) */
  structureId: IdSchema,
  /** Chapter/scene number in reading order (1-indexed) */
  position: z.number().int().positive(),
  /** Title of the chapter/scene */
  title: z.string(),
  /** Type of structure */
  structureType: z.enum(['chapter', 'scene']),
  /** Planned tension target from structure (0-100) */
  plannedTension: z.number().min(0).max(100).optional(),
  /** Actual tension from content analysis (0-100) */
  actualTension: z.number().min(0).max(100).optional(),
  /** Divergence: actual - planned (positive = higher than planned) */
  divergence: z.number().optional(),
  /** Word count from analysis */
  wordCount: z.number().int().min(0).optional(),
  /** Content status */
  contentStatus: ContentStatusForCurveSchema.optional(),
  /** Whether content exists for this structure */
  hasContent: z.boolean(),
  /** Whether analysis exists for this content */
  hasAnalysis: z.boolean(),
  /** Content ID if content exists */
  contentId: IdSchema.optional(),
});
export type TensionCurveDataPoint = z.infer<typeof TensionCurveDataPointSchema>;

/**
 * Metadata about the tension curve data
 */
export const TensionCurveMetadataSchema = z.object({
  /** Book or arc ID that this curve covers */
  rootStructureId: IdSchema,
  /** Title of the root structure */
  rootTitle: z.string(),
  /** When this data was generated */
  generatedAt: TimestampSchema,
  /** Total number of data points */
  dataPointCount: z.number().int().min(0),
  /** Number of data points with planned tension */
  plannedCount: z.number().int().min(0),
  /** Number of data points with actual tension */
  actualCount: z.number().int().min(0),
  /** Average planned tension (if any planned data) */
  averagePlannedTension: z.number().min(0).max(100).optional(),
  /** Average actual tension (if any actual data) */
  averageActualTension: z.number().min(0).max(100).optional(),
  /** Average absolute divergence (if any divergence data) */
  averageAbsoluteDivergence: z.number().min(0).optional(),
});
export type TensionCurveMetadata = z.infer<typeof TensionCurveMetadataSchema>;

/**
 * Complete tension curve data for visualization
 *
 * Contains all data points in reading order with metadata
 * for summary statistics.
 */
export const TensionCurveDataSchema = z.object({
  /** Data points in reading order */
  dataPoints: z.array(TensionCurveDataPointSchema),
  /** Summary metadata */
  metadata: TensionCurveMetadataSchema,
});
export type TensionCurveData = z.infer<typeof TensionCurveDataSchema>;

/**
 * Character appearance in a specific chapter/scene
 */
export const CharacterAppearanceDataPointSchema = z.object({
  /** Structure ID (chapter or scene) */
  structureId: IdSchema,
  /** Chapter/scene position in reading order (1-indexed) */
  position: z.number().int().positive(),
  /** Title of the chapter/scene */
  title: z.string(),
  /** Content ID if content exists */
  contentId: IdSchema.optional(),
  /** Type of presence in this chapter */
  presenceType: PresenceTypeSchema,
  /** Number of dialogue lines (if available) */
  dialogueLines: z.number().int().min(0).optional(),
  /** Whether this is a POV chapter for this character */
  isPov: z.boolean(),
});
export type CharacterAppearanceDataPoint = z.infer<typeof CharacterAppearanceDataPointSchema>;

/**
 * Relationship state at a point in time
 */
export const RelationshipSnapshotSchema = z.object({
  /** Target character ID */
  targetCharacterId: IdSchema,
  /** Target character name (for display) */
  targetCharacterName: z.string(),
  /** Relationship type */
  type: RelationshipTypeSchema,
  /** Intensity at this point (-100 to 100) */
  intensity: z.number().min(-100).max(100),
  /** Chapter position where this was measured */
  position: z.number().int().positive(),
  /** Structure ID of the chapter */
  structureId: IdSchema,
});
export type RelationshipSnapshot = z.infer<typeof RelationshipSnapshotSchema>;

/**
 * Evolution of a relationship over time
 */
export const RelationshipEvolutionSchema = z.object({
  /** Target character ID */
  targetCharacterId: IdSchema,
  /** Target character name */
  targetCharacterName: z.string(),
  /** Relationship type */
  type: RelationshipTypeSchema,
  /** Snapshots over time */
  snapshots: z.array(RelationshipSnapshotSchema),
  /** Starting intensity */
  startIntensity: z.number().min(-100).max(100),
  /** Current/latest intensity */
  currentIntensity: z.number().min(-100).max(100),
  /** Total change (current - start) */
  totalChange: z.number(),
});
export type RelationshipEvolution = z.infer<typeof RelationshipEvolutionSchema>;

/**
 * Arc milestone with tracking status
 */
export const ArcMilestoneProgressSchema = z.object({
  /** Milestone description */
  description: z.string(),
  /** Chapter ID where achieved (if achieved) */
  chapterId: IdSchema.optional(),
  /** Chapter position (if achieved) */
  chapterPosition: z.number().int().positive().optional(),
  /** Whether this milestone has been achieved */
  achieved: z.boolean(),
  /** Order of this milestone */
  order: z.number().int().min(0),
});
export type ArcMilestoneProgress = z.infer<typeof ArcMilestoneProgressSchema>;

/**
 * Character arc progress tracking
 */
export const CharacterArcProgressSchema = z.object({
  /** Arc type */
  arcType: CharacterArcTypeSchema,
  /** Starting point description */
  startingPoint: z.string(),
  /** Destination description */
  destination: z.string(),
  /** Overall progress percentage (0-100) */
  progress: z.number().min(0).max(100),
  /** Milestone progress */
  milestones: z.array(ArcMilestoneProgressSchema),
  /** Number of milestones achieved */
  achievedMilestones: z.number().int().min(0),
  /** Total number of milestones */
  totalMilestones: z.number().int().min(0),
});
export type CharacterArcProgress = z.infer<typeof CharacterArcProgressSchema>;

/**
 * Complete character tracking data for a single character
 */
export const CharacterTrackingDataSchema = z.object({
  /** Character ID */
  characterId: IdSchema,
  /** Character name */
  characterName: z.string(),
  /** Character role */
  role: CharacterRoleSchema,
  /** Appearance data points */
  appearances: z.array(CharacterAppearanceDataPointSchema),
  /** Relationship evolution data */
  relationshipEvolution: z.array(RelationshipEvolutionSchema),
  /** Arc progress (if character has an arc) */
  arcProgress: CharacterArcProgressSchema.optional(),
  /** Summary statistics */
  summary: z.object({
    /** Total appearances */
    totalAppearances: z.number().int().min(0),
    /** POV chapters */
    povChapters: z.number().int().min(0),
    /** Scene appearances */
    sceneAppearances: z.number().int().min(0),
    /** Mention-only appearances */
    mentionAppearances: z.number().int().min(0),
    /** Total dialogue lines */
    totalDialogueLines: z.number().int().min(0),
    /** First appearance position */
    firstAppearance: z.number().int().positive().optional(),
    /** Last appearance position */
    lastAppearance: z.number().int().positive().optional(),
    /** Appearance density (appearances / total chapters) */
    appearanceDensity: z.number().min(0).max(1),
  }),
});
export type CharacterTrackingData = z.infer<typeof CharacterTrackingDataSchema>;

/**
 * Character presence heatmap data for visualization
 *
 * Each row is a character, each column is a chapter position.
 * Value indicates presence intensity.
 */
export const CharacterPresenceHeatmapSchema = z.object({
  /** Character IDs in row order */
  characterIds: z.array(IdSchema),
  /** Character names (parallel to characterIds) */
  characterNames: z.array(z.string()),
  /** Chapter positions (column headers) */
  positions: z.array(z.number().int().positive()),
  /** Chapter titles (parallel to positions) */
  titles: z.array(z.string()),
  /**
   * Presence matrix: [characterIndex][positionIndex] = intensity
   * 0 = not present, 1 = mention, 2 = scene, 3 = POV
   */
  matrix: z.array(z.array(z.number().int().min(0).max(3))),
  /** When this data was generated */
  generatedAt: TimestampSchema,
});
export type CharacterPresenceHeatmap = z.infer<typeof CharacterPresenceHeatmapSchema>;

/**
 * A single data point tracking thread status at a chapter position
 */
export const ThreadStatusPointSchema = z.object({
  /** Structure ID (chapter or scene) */
  structureId: IdSchema,
  /** Content ID if available */
  contentId: IdSchema.optional(),
  /** Chapter/scene position in reading order (1-indexed) */
  position: z.number().int().positive(),
  /** Title of the chapter/scene */
  title: z.string(),
  /** Type of touch at this position */
  touchType: ThreadTouchTypeSchema,
});
export type ThreadStatusPoint = z.infer<typeof ThreadStatusPointSchema>;

/**
 * Promise fulfillment tracking for a single promise
 */
export const PromiseTrackingSchema = z.object({
  /** Promise ID */
  promiseId: IdSchema,
  /** Promise description */
  description: z.string(),
  /** Chapter position where promise was made */
  madeAtPosition: z.number().int().positive().optional(),
  /** Content ID where promise was made */
  madeAtContentId: IdSchema.optional(),
  /** Expected payoff timeframe */
  expectedPayoff: PromisePayoffSchema,
  /** Current status */
  status: PromiseStatusSchema,
  /** Chapter position where fulfilled (if applicable) */
  fulfilledAtPosition: z.number().int().positive().optional(),
  /** Content ID where fulfilled (if applicable) */
  fulfilledAtContentId: IdSchema.optional(),
  /** Number of chapters between made and fulfilled (if fulfilled) */
  chaptersToFulfillment: z.number().int().min(0).optional(),
});
export type PromiseTracking = z.infer<typeof PromiseTrackingSchema>;

/**
 * A dormant period where a thread had no touches
 */
export const DormantPeriodSchema = z.object({
  /** Starting position (last touch before dormancy) */
  startPosition: z.number().int().positive(),
  /** Ending position (first touch after dormancy, or current if still dormant) */
  endPosition: z.number().int().positive(),
  /** Number of chapters in dormant period */
  duration: z.number().int().min(1),
});
export type DormantPeriod = z.infer<typeof DormantPeriodSchema>;

/**
 * Complete plot thread tracking data for a single thread
 */
export const PlotThreadTrackingDataSchema = z.object({
  /** Thread ID */
  threadId: IdSchema,
  /** Thread name */
  threadName: z.string(),
  /** Thread type */
  threadType: PlotThreadTypeSchema,
  /** Thread scope */
  scope: PlotThreadScopeSchema,
  /** Current thread status */
  status: PlotThreadStatusSchema,
  /** Thread priority (0-100) */
  priority: z.number().int().min(0).max(100),
  /** Introduction point if detected in content */
  introduction: z
    .object({
      position: z.number().int().positive(),
      contentId: IdSchema,
    })
    .optional(),
  /** Resolution point if thread is resolved */
  resolution: z
    .object({
      position: z.number().int().positive(),
      contentId: IdSchema,
    })
    .optional(),
  /** All status points (touches) in reading order */
  statusPoints: z.array(ThreadStatusPointSchema),
  /** Promise tracking data */
  promises: z.array(PromiseTrackingSchema),
  /** IDs of characters involved in this thread */
  involvedCharacterIds: z.array(IdSchema),
  /** Summary statistics */
  summary: z.object({
    /** Total number of touches */
    totalTouches: z.number().int().min(0),
    /** First touch position */
    firstTouchPosition: z.number().int().positive().optional(),
    /** Last touch position */
    lastTouchPosition: z.number().int().positive().optional(),
    /** Active duration (last - first touch positions) */
    activeDuration: z.number().int().min(0).optional(),
    /** Periods where thread went dormant */
    dormantPeriods: z.array(DormantPeriodSchema),
    /** Total chapters in dormant periods */
    totalDormantChapters: z.number().int().min(0),
    /** Total promises */
    totalPromises: z.number().int().min(0),
    /** Fulfilled promises */
    fulfilledPromises: z.number().int().min(0),
    /** Promise fulfillment rate (0-1) */
    promiseFulfillmentRate: z.number().min(0).max(1),
    /** Number of unfulfilled promises */
    unfulfilledCount: z.number().int().min(0),
    /** Average chapters to fulfill a promise */
    averageChaptersToFulfillment: z.number().min(0).optional(),
    /** Whether thread is completed (resolved or abandoned) */
    isCompleted: z.boolean(),
    /** Whether thread is dangling (active/dormant with no recent touches) */
    isDangling: z.boolean(),
    /** Touch density (touches / total chapters) */
    touchDensity: z.number().min(0).max(1),
  }),
});
export type PlotThreadTrackingData = z.infer<typeof PlotThreadTrackingDataSchema>;

/**
 * Plot thread activity heatmap for visualization
 *
 * Each row is a thread, each column is a chapter position.
 * Value indicates touch type (0 = no touch, 1-5 = touch types)
 */
export const ThreadActivityHeatmapSchema = z.object({
  /** Thread IDs in row order */
  threadIds: z.array(IdSchema),
  /** Thread names (parallel to threadIds) */
  threadNames: z.array(z.string()),
  /** Chapter positions (column headers) */
  positions: z.array(z.number().int().positive()),
  /** Chapter titles (parallel to positions) */
  titles: z.array(z.string()),
  /**
   * Activity matrix: [threadIndex][positionIndex] = touch type
   * 0 = no touch, 1 = introduction, 2 = development, 3 = complication, 4 = climax, 5 = resolution
   */
  matrix: z.array(z.array(z.number().int().min(0).max(5))),
  /** When this data was generated */
  generatedAt: TimestampSchema,
});
export type ThreadActivityHeatmap = z.infer<typeof ThreadActivityHeatmapSchema>;

// ============================================================================
// Hook Management Types (Phase 5.1)
// ============================================================================

/**
 * Hook data point for visualization
 */
export const HookDataPointSchema = z.object({
  /** Content ID */
  contentId: IdSchema,
  /** Chapter title */
  title: z.string().optional(),
  /** Position in reading order (1-indexed) */
  position: z.number().int().positive(),
  /** Hook type (includes 'none' for chapters without detected hooks) */
  hookType: AnalysisHookTypeSchema,
  /** Hook strength (0-100) */
  strength: z.number().min(0).max(100),
});
export type HookDataPoint = z.infer<typeof HookDataPointSchema>;

/**
 * Strength trend information for hook analysis
 */
export const StrengthTrendInfoSchema = z.object({
  /** Trend direction */
  trend: z.enum(['improving', 'declining', 'stable']),
  /** Average strength */
  average: z.number().min(0).max(100),
  /** Recent average (last N hooks) */
  recentAverage: z.number().min(0).max(100),
  /** Overall trend slope */
  slope: z.number(),
});
export type StrengthTrendInfo = z.infer<typeof StrengthTrendInfoSchema>;

/**
 * Repetition detail for hook patterns
 */
export const RepetitionDetailSchema = z.object({
  /** The repeated hook type */
  hookType: z.string(),
  /** Starting position of repetition */
  startPosition: z.number().int().positive(),
  /** Consecutive count */
  count: z.number().int().positive(),
  /** Severity level */
  severity: z.enum(['minor', 'moderate', 'severe']),
});
export type RepetitionDetail = z.infer<typeof RepetitionDetailSchema>;

/**
 * Complete hook management result for visualization
 */
export const HookManagementResultSchema = z.object({
  /** Hook type distribution (count per type) */
  distribution: z.record(z.string(), z.number()),
  /** Data points for visualization */
  dataPoints: z.array(HookDataPointSchema),
  /** Variety score (0-100) */
  varietyScore: z.number().min(0).max(100),
  /** Repetition details */
  repetitionDetails: z.array(RepetitionDetailSchema),
  /** Strength trend information */
  strengthTrend: StrengthTrendInfoSchema,
  /** Warnings about hook patterns */
  warnings: z.array(z.string()),
});
export type HookManagementResult = z.infer<typeof HookManagementResultSchema>;

// ============================================================================
// Cycle Enforcement Types (Phase 5.2)
// ============================================================================

/**
 * Data point for a chapter within a cycle
 */
export const CycleDataPointSchema = z.object({
  /** Structure ID of the chapter */
  structureId: z.string(),
  /** Title of the chapter */
  title: z.string(),
  /** Global position (1-indexed, across all chapters) */
  globalPosition: z.number().int().positive(),
  /** Position within cycle (0-indexed, 0 to cycleLength-1) */
  cyclePosition: z.number().int().min(0),
  /** Cycle number (1-indexed) */
  cycleNumber: z.number().int().positive(),
  /** Target tension for this cycle position */
  targetTension: z.number().min(0).max(100),
  /** Planned tension from structure (if set) */
  plannedTension: z.number().min(0).max(100).optional(),
  /** Actual tension from analysis (if available) */
  actualTension: z.number().min(0).max(100).optional(),
  /** Deviation from cycle target */
  deviationFromTarget: z.number().optional(),
});
export type CycleDataPoint = z.infer<typeof CycleDataPointSchema>;

/**
 * Result of cycle phase detection
 */
export const CyclePhaseResultSchema = z.object({
  /** Current cycle number (1-indexed) */
  currentCycle: z.number().int().positive(),
  /** Position within current cycle (0-indexed) */
  currentPosition: z.number().int().min(0),
  /** Cycle length (number of positions per cycle) */
  cycleLength: z.number().int().positive(),
  /** Tension targets for each position in the cycle */
  tensionTargets: z.array(z.number().min(0).max(100)),
  /** Total chapters in the project */
  totalChapters: z.number().int().min(0),
  /** Chapters completed in current cycle */
  chaptersInCurrentCycle: z.number().int().min(0),
  /** Is current cycle complete */
  isCycleComplete: z.boolean(),
  /** Phase description (e.g., "rising", "peak", "falling") */
  phaseDescription: z.string(),
  /** Next position's target tension */
  nextTargetTension: z.number().min(0).max(100).optional(),
});
export type CyclePhaseResult = z.infer<typeof CyclePhaseResultSchema>;

/**
 * A tension violation within a cycle
 */
export const CycleViolationSchema = z.object({
  /** Structure ID of the chapter */
  structureId: z.string(),
  /** Title of the chapter */
  title: z.string(),
  /** Global position */
  globalPosition: z.number().int().positive(),
  /** Cycle position */
  cyclePosition: z.number().int().min(0),
  /** Expected tension for this position */
  expectedTension: z.number().min(0).max(100),
  /** Actual tension value (from analysis or planned) */
  actualValue: z.number().min(0).max(100),
  /** Deviation amount (actual - expected) */
  deviation: z.number(),
  /** Severity level */
  severity: z.enum(['minor', 'moderate', 'severe']),
});
export type CycleViolation = z.infer<typeof CycleViolationSchema>;

/**
 * Rebalancing suggestion
 */
export const RebalancingSuggestionSchema = z.object({
  /** Target structure ID */
  structureId: z.string(),
  /** Title of the chapter */
  title: z.string(),
  /** Current tension value */
  currentTension: z.number().min(0).max(100),
  /** Suggested tension value */
  suggestedTension: z.number().min(0).max(100),
  /** Direction of change needed */
  direction: z.enum(['increase', 'decrease']),
  /** Priority of this suggestion */
  priority: z.enum(['low', 'medium', 'high']),
  /** Explanation of the suggestion */
  explanation: z.string(),
});
export type RebalancingSuggestion = z.infer<typeof RebalancingSuggestionSchema>;

/**
 * Statistics about cycle enforcement
 */
export const CycleEnforcementStatsSchema = z.object({
  /** Total number of cycles (including partial) */
  totalCycles: z.number().int().min(0),
  /** Number of complete cycles */
  completeCycles: z.number().int().min(0),
  /** Average deviation from cycle targets */
  averageDeviation: z.number(),
  /** Number of violations */
  violationCount: z.number().int().min(0),
  /** Percentage of chapters within tolerance */
  complianceRate: z.number().min(0).max(100),
});
export type CycleEnforcementStats = z.infer<typeof CycleEnforcementStatsSchema>;

/**
 * Complete cycle enforcement analysis result
 */
export const CycleEnforcementResultSchema = z.object({
  /** All chapter data points with cycle information */
  dataPoints: z.array(CycleDataPointSchema),
  /** Current cycle phase information */
  phaseInfo: CyclePhaseResultSchema,
  /** Detected violations */
  violations: z.array(CycleViolationSchema),
  /** Rebalancing suggestions */
  suggestions: z.array(RebalancingSuggestionSchema),
  /** Summary statistics */
  stats: CycleEnforcementStatsSchema,
  /** Generated warnings */
  warnings: z.array(z.string()),
});
export type CycleEnforcementResult = z.infer<typeof CycleEnforcementResultSchema>;
