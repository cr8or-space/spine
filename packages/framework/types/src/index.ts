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

// Base types
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
