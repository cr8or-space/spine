/**
 * Revision cascade package
 *
 * Provides change propagation management within configured bounds,
 * protecting content behind lock points and published content from changes.
 */

export { clearHorizonConfigs, createRevisionCascadeService } from './service';
export type {
  AffectedContent,
  AffectReason,
  CascadeExecutionOptions,
  CascadeExecutionResult,
  CascadePreview,
  CascadePreviewItem,
  ImpactAnalysisResult,
  RevisionCascadeService,
  RevisionHorizonConfig,
} from './types';
export { DEFAULT_HORIZON_CONFIG } from './types';
