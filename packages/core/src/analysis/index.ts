/**
 * Analysis module for NovelGen
 *
 * Provides LLM-based content analysis including:
 * - Tension scoring (0-100 with explanation)
 * - Hook strength analysis (chapter endings)
 * - Pacing assessment
 * - Continuity checking against story bible
 * - Analysis storage and history
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
