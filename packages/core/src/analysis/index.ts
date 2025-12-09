/**
 * Analysis module for Spine
 *
 * Provides LLM-based content analysis including:
 * - Tension scoring (0-100 with explanation)
 * - Hook strength analysis (chapter endings)
 * - Pacing assessment
 * - Continuity checking against story bible
 * - Analysis storage and history
 * - Tension curve data generation (Phase 4.1)
 * - Character tracking and presence analysis (Phase 4.2)
 * - Plot thread tracking (Phase 4.3)
 * - Hook management for web serials (Phase 5.1)
 * - Cycle enforcement for tension patterns (Phase 5.2)
 */

// Service
export { createAnalysisService } from './service';

// Repository
export {
  createAnalysisRepository,
  CREATE_ANALYSIS_TABLE_SQL,
  DROP_ANALYSIS_TABLE_SQL,
  type AnalysisRepository,
} from './repository';

// Tension curve (Phase 4.1)
export {
  extractPlannedTension,
  generateTensionCurve,
  calculateDivergence,
  aggregateActualTension,
  calculateStructureDivergence,
  getHighDivergenceChapters,
  getMissingAnalysisChapters,
  getMissingTargetChapters,
  type TensionCurveInput,
  type TensionCurveDependencies,
} from './tension-curve';

// Character tracking (Phase 4.2)
export {
  generateCharacterTrackingData,
  generateAllCharacterTracking,
  generatePresenceHeatmap,
  presenceToIntensity,
  intensityToPresence,
  getCharactersWithDecliningPresence,
  getCharactersMissingRecently,
  getCharactersWithIncompleteArcs,
  getTopCharactersByPresence,
  getCharactersByPOVCount,
  type CharacterTrackingInput,
  type CharacterTrackingDependencies,
} from './character-tracking';

// Plot thread tracking (Phase 4.3)
export {
  generatePlotThreadTrackingData,
  generateAllPlotThreadTracking,
  generateThreadActivityHeatmap,
  touchTypeToNumber,
  numberToTouchType,
  getThreadsWithDanglingPromises,
  getThreadsMissingTouches,
  getIncompleteThreads,
  getDanglingThreads,
  getThreadsByStatus,
  getThreadsByType,
  getTopThreadsByTouches,
  getThreadsByPriority,
  getPromiseFulfillmentSummary,
  DEFAULT_DANGLING_CONFIG,
  type PlotThreadTrackingInput,
  type PlotThreadTrackingDependencies,
  type DanglingDetectionConfig,
} from './plot-thread-tracking';

// Types
export type {
  AnalysisConfig,
  AnalysisInput,
  AnalysisService,
  CharacterMention,
  ContentSummaryForAnalysis,
  ContinuityCheckResult,
  FullAnalysisResult,
  HookAnalysisResult,
  LocationMention,
  PacingAnalysisResult,
  PacingSegment,
  TensionAnalysisResult,
  TensionMoment,
} from './types';

export { DEFAULT_ANALYSIS_CONFIG } from './types';

// Prompts (for customization/testing)
export {
  ANALYSIS_SYSTEM_PROMPT,
  buildContinuityPrompt,
  buildHookPrompt,
  buildPacingPrompt,
  buildTensionPrompt,
} from './prompts';

// Hook management (Phase 5.1)
export {
  analyzeHookPatterns,
  calculateHookDistribution,
  calculateStrengthTrend,
  calculateVarietyScore,
  classifyHookFromExplanation,
  DEFAULT_HOOK_ANALYSIS_CONFIG,
  detectRepetitions,
  extractHookDataPoints,
  generateVarietyWarnings,
  getHookUsageSummary,
  HOOK_TYPES,
  suggestNextHookType,
  type HookAnalysisConfig,
  type HookDataPoint,
  type HookPatternResult,
  type RepetitionDetail,
  type StrengthTrendInfo,
} from './hook-management';

// Cycle enforcement (Phase 5.2)
export {
  analyzeCycleEnforcement,
  buildCyclePositionConfigs,
  buildPositionTargetMap,
  DEFAULT_CYCLE_ENFORCEMENT_CONFIG,
  DEFAULT_CYCLE_PATTERN,
  detectCyclePhase,
  detectCycleViolations,
  extractCycleDataPoints,
  generateCycleWarnings,
  generateRebalancingSuggestions,
  getCycleNumber,
  getCyclePosition,
  getCycleSummary,
  getPhaseDescription,
  getPositionTargetTension,
  PHASE_DESCRIPTIONS,
  suggestNextChapterTension,
  validateCycleConfiguration,
  type CycleDataPoint,
  type CycleEnforcementConfig,
  type CycleEnforcementResult,
  type CycleEnforcementStats,
  type CyclePhaseResult,
  type CyclePositionConfig,
  type CycleViolation,
  type RebalancingSuggestion,
} from './cycle-enforcement';

// Reference extraction (Phase 7.VR.3)
export {
  ProseReferenceExtractor,
  CompositeReferenceExtractor,
  DEFAULT_PROSE_EXTRACTOR_CONFIG,
  type ReferenceExtractor,
  type EntityRegistry,
  type EntityInfo,
  type ProseExtractorConfig,
} from './reference-extractor';
