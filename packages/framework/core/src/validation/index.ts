/**
 * Validation module - Pipeline orchestration and result management.
 */

// Pipeline
export {
  createValidatorRegistry,
  createValidationPipeline,
  type ValidationPipeline,
  type PipelineOptions,
  type PipelineResult,
} from './pipeline';

// Results
export {
  createValidationResultsRepository,
  aggregateResults,
  filterByStatus,
  filterByLocation,
  type ValidationResultsRepository,
  type StoredValidationResult,
  type ValidationSummary,
} from './results';
