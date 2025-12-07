import { z } from 'zod';

import { IdSchema, TimestampSchema } from './common';

/**
 * Continuity issue detected in content
 */
export const ContinuityIssueSchema = z.object({
  id: IdSchema,
  /** Type of continuity problem */
  type: z.enum([
    'character-inconsistency',
    'location-error',
    'timeline-conflict',
    'fact-contradiction',
    'world-rule-violation',
    'character-voice',
    'relationship-error',
    'other',
  ]),
  /** Severity of the issue */
  severity: z.enum(['critical', 'major', 'minor', 'nitpick']),
  description: z.string(),
  /** Location in content where issue occurs */
  location: z.object({
    paragraphIndex: z.number().int().min(0).optional(),
    startOffset: z.number().int().min(0).optional(),
    endOffset: z.number().int().min(0).optional(),
  }),
  /** Reference to conflicting bible entry or content */
  conflictsWith: z.object({
    type: z.enum(['character', 'location', 'world-rule', 'content', 'timeline-event']),
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
      type: z.enum(['mention', 'scene', 'pov']),
      dialogueLines: z.number().int().min(0).optional(),
    })
  ),
  /** Locations featured in this content */
  locationAppearances: z.array(IdSchema),
  /** Plot threads touched */
  threadTouches: z.array(
    z.object({
      threadId: IdSchema,
      type: z.enum(['introduction', 'development', 'complication', 'climax', 'resolution']),
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
      lastTouchType: z.enum(['introduction', 'development', 'complication', 'climax', 'resolution']),
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
      hookType: z.enum([
        'revelation',
        'decision',
        'cliffhanger',
        'emotional',
        'question',
        'twist',
        'promise',
      ]),
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
 * Presence type for character appearances
 */
export const PresenceTypeSchema = z.enum(['mention', 'scene', 'pov']);
export type PresenceType = z.infer<typeof PresenceTypeSchema>;

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
  type: z.enum([
    'family',
    'friend',
    'enemy',
    'romantic',
    'professional',
    'rival',
    'mentor',
    'other',
  ]),
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
  type: z.enum([
    'family',
    'friend',
    'enemy',
    'romantic',
    'professional',
    'rival',
    'mentor',
    'other',
  ]),
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
  arcType: z.enum([
    'positive-change',
    'negative-change',
    'flat',
    'corruption',
    'redemption',
    'coming-of-age',
    'disillusionment',
  ]),
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
  role: z.enum(['protagonist', 'antagonist', 'major', 'supporting', 'minor']),
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
