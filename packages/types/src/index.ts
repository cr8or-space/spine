// Common types and utilities
export {
  IdSchema,
  TimestampSchema,
  EntityRefSchema,
  CrossReferenceSchema,
  type Id,
  type Timestamp,
  type EntityRef,
  type CrossReference,
  type Result,
} from './common';

// Base types (Spine framework preparation)
export {
  SpinePositionSchema,
  BaseEntitySchema,
  BaseContentStatusSchema,
  ReferenceSchema,
  BaseContentSchema,
  ValidationPhaseSchema,
  ValidationResultSchema,
  // Content status transitions
  validTransitions,
  canTransition,
  getValidNextStatuses,
  isTerminalStatus,
  canModify,
  getPreviousStatus,
  getNextStatus,
  type SpinePosition,
  type BaseEntity,
  type BaseContentStatus,
  type Reference,
  type BaseContent,
  type Spine,
  type TreeSpine,
  type MutableSpine,
  type ValidationPhase,
  type ValidationResult,
  type Validator,
  type ValidatorRegistry,
} from './base';

// Character types
export {
  TraitSchema,
  RelationshipSchema,
  CharacterArcSchema,
  AppearanceRefSchema,
  CharacterSchema,
  CharacterSummarySchema,
  type Trait,
  type Relationship,
  type CharacterArc,
  type AppearanceRef,
  type Character,
  type CharacterSummary,
} from './character';

// Location types
export {
  LocationRelationSchema,
  LocationFeatureSchema,
  LocationTypeSchema,
  LocationSchema,
  LocationSummarySchema,
  type LocationRelation,
  type LocationFeature,
  type LocationType,
  type Location,
  type LocationSummary,
} from './location';

// Faction types
export {
  FactionRankSchema,
  FactionRelationSchema,
  FactionMemberSchema,
  FactionTypeSchema,
  FactionSchema,
  FactionSummarySchema,
  type FactionRank,
  type FactionRelation,
  type FactionMember,
  type FactionType,
  type Faction,
  type FactionSummary,
} from './faction';

// World rule types
export {
  RuleExceptionSchema,
  WorldRuleCategorySchema,
  WorldRuleSchema,
  WorldRuleSummarySchema,
  type RuleException,
  type WorldRuleCategory,
  type WorldRule,
  type WorldRuleSummary,
} from './world-rule';

// Plot thread types
export {
  NarrativePromiseSchema,
  ThreadTouchSchema,
  PlotThreadTypeSchema,
  PlotThreadSchema,
  PlotThreadSummarySchema,
  type NarrativePromise,
  type ThreadTouch,
  type PlotThreadType,
  type PlotThread,
  type PlotThreadSummary,
} from './plot-thread';

// Timeline types
export {
  TimelinePositionSchema,
  CausalLinkSchema,
  TimelineEventTypeSchema,
  TimelineEventSchema,
  TimelineEventSummarySchema,
  TimelineSpanSchema,
  type TimelinePosition,
  type CausalLink,
  type TimelineEventType,
  type TimelineEvent,
  type TimelineEventSummary,
  type TimelineSpan,
} from './timeline';

// Bible types
export {
  BibleSchema,
  BibleSummarySchema,
  createEmptyBible,
  type Bible,
  type BibleSummary,
} from './bible';

// Structure types
export {
  BeatSchema,
  HookTypeSchema,
  HookSchema,
  ChapterTypeSchema,
  StructureTypeSchema,
  StructureSchema,
  StructureRefSchema,
  createEmptyStructure,
  type Beat,
  type HookType,
  type Hook,
  type ChapterType,
  type StructureType,
  type Structure,
  type StructureRef,
} from './structure';

// Analysis types
export {
  ContinuityIssueSchema,
  ExplainedScoreSchema,
  ContentAnalysisSchema,
  AggregatedAnalysisSchema,
  HookPatternAnalysisSchema,
  TensionCurveDataPointSchema,
  TensionCurveMetadataSchema,
  TensionCurveDataSchema,
  PresenceTypeSchema,
  CharacterAppearanceDataPointSchema,
  RelationshipSnapshotSchema,
  RelationshipEvolutionSchema,
  ArcMilestoneProgressSchema,
  CharacterArcProgressSchema,
  CharacterTrackingDataSchema,
  CharacterPresenceHeatmapSchema,
  ThreadTouchTypeSchema,
  ThreadStatusPointSchema,
  PromiseTrackingSchema,
  DormantPeriodSchema,
  PlotThreadTrackingDataSchema,
  ThreadActivityHeatmapSchema,
  type ContinuityIssue,
  type ExplainedScore,
  type ContentAnalysis,
  type AggregatedAnalysis,
  type HookPatternAnalysis,
  type TensionCurveDataPoint,
  type TensionCurveMetadata,
  type TensionCurveData,
  type PresenceType,
  type CharacterAppearanceDataPoint,
  type RelationshipSnapshot,
  type RelationshipEvolution,
  type ArcMilestoneProgress,
  type CharacterArcProgress,
  type CharacterTrackingData,
  type CharacterPresenceHeatmap,
  type ThreadTouchType,
  type ThreadStatusPoint,
  type PromiseTracking,
  type DormantPeriod,
  type PlotThreadTrackingData,
  type ThreadActivityHeatmap,
} from './analysis';

// Review types
export {
  ContentStatusSchema,
  ReviewCommentSchema,
  ParagraphActionSchema,
  ReviewSchema,
  LockPointSchema,
  GenerationRecordSchema,
  RevisionImpactSchema,
  ReviewQueueItemSchema,
  type ContentStatus,
  type ReviewComment,
  type ParagraphAction,
  type Review,
  type LockPoint,
  type GenerationRecord,
  type RevisionImpact,
  type ReviewQueueItem,
} from './review';

// Content types
export {
  VersionSourceSchema,
  VersionMetadataSchema,
  ContentVersionSchema,
  ContentSchema,
  ContentSummarySchema,
  DiffHunkSchema,
  WordDiffSchema,
  ContentDiffSchema,
  VersionComparisonSchema,
  createEmptyContent,
  type VersionSource,
  type VersionMetadata,
  type ContentVersion,
  type Content,
  type ContentSummary,
  type DiffHunk,
  type WordDiff,
  type ContentDiff,
  type VersionComparison,
} from './content';

// Project types
export {
  ProjectFormatSchema,
  LlmConfigSchema,
  RevisionSettingsSchema,
  SerialSettingsSchema,
  ExtractionSettingsSchema,
  ProjectSettingsSchema,
  ProjectMetadataSchema,
  ProjectStatsSchema,
  ProjectSchema,
  ProjectSummarySchema,
  DEFAULT_LLM_CONFIG,
  createDefaultSettings,
  type ProjectFormat,
  type LlmConfig,
  type RevisionSettings,
  type SerialSettings,
  type ExtractionSettings,
  type ProjectSettings,
  type ProjectMetadata,
  type ProjectStats,
  type Project,
  type ProjectSummary,
} from './project';

// Release planning types (Phase 5.3)
export {
  ReleaseScheduleConfigSchema,
  ScheduledReleaseSchema,
  BufferStatusSchema,
  ReleaseProjectionSchema,
  BufferDepletionSchema,
  DeadlineUrgencySchema,
  DeadlineStatusSchema,
  ChapterReleaseDataPointSchema,
  ReleasePlanningResultSchema,
  ReleasePlanningConfigSchema,
  type ReleaseScheduleConfig,
  type ScheduledRelease,
  type BufferStatus,
  type ReleaseProjection,
  type BufferDepletion,
  type DeadlineUrgency,
  type DeadlineStatus,
  type ChapterReleaseDataPoint,
  type ReleasePlanningResult,
  type ReleasePlanningConfig,
} from './release';
