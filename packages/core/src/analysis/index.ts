/**
 * Analysis module for NovelGen
 *
 * Provides LLM-based content analysis including:
 * - Tension scoring (0-100 with explanation)
 * - Hook strength analysis (chapter endings)
 * - Pacing assessment
 * - Continuity checking against story bible
 * - Analysis storage and history
 * - Tension curve data generation (Phase 4.1)
 * - Character tracking and presence analysis (Phase 4.2)
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
