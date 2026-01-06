/**
 * Generation pipeline module
 *
 * Orchestrates the outline → beats → draft → self-review generation cycle.
 */

// Types
export type {
  GenerationStage,
  StageStatus,
  PipelineState,
  StageResult,
  SelfReviewFeedback,
  SelfReviewIssue,
  PipelineError,
  GenerationRequest,
  GenerationOptions,
  GenerationResult,
  PromptTemplate,
  PromptPlaceholders,
  GenerationHistoryEntry,
  GenerationPipeline,
} from './types';

export { DEFAULT_GENERATION_OPTIONS } from './types';

// Prompt templates
export {
  BASE_SYSTEM_PROMPT,
  OUTLINE_TEMPLATE,
  BEATS_TEMPLATE,
  DRAFT_TEMPLATE,
  SELF_REVIEW_TEMPLATE,
  REVISION_TEMPLATE,
  STAGE_TEMPLATES,
  fillTemplate,
  getStageTemplate,
  buildStageMessages,
} from './prompts';

// Pipeline
export { createGenerationPipeline } from './pipeline';

// History
export type { GenerationHistoryStore, GenerationStats } from './history';
export {
  createGenerationHistoryStore,
  createHistoryEntry,
  historyEntryToRecord,
} from './history';

// Outline service
export type {
  OutlineConfig,
  OutlineInput,
  OutlineResult,
  OutlineService,
  OutlineValidation,
} from './outline';
export { createOutlineService, DEFAULT_OUTLINE_CONFIG } from './outline';

// Beats service
export type {
  BeatsConfig,
  BeatsInput,
  BeatsResult,
  BeatsService,
  ExpandedBeat,
} from './beats';
export { createBeatsService, DEFAULT_BEATS_CONFIG } from './beats';

// Draft service
export type {
  DraftConfig,
  DraftInput,
  DraftResult,
  DraftService,
  RevisionInput,
} from './draft';
export { createDraftService, DEFAULT_DRAFT_CONFIG } from './draft';
