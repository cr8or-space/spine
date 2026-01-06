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
  // Entity types
  SpinePositionSchema,
  BaseEntitySchema,
  EntityLifecycleSchema,
  type SpinePosition,
  type BaseEntity,
  type EntityLifecycle,
  type EntityType,
  type EntityRegistry,
  // Content types
  BaseContentStatusSchema,
  ReferenceSchema,
  BaseContentSchema,
  type BaseContentStatus,
  type Reference,
  type BaseContent,
  // Content status transitions
  validTransitions,
  canTransition,
  getValidNextStatuses,
  isTerminalStatus,
  canModify,
  getPreviousStatus,
  getNextStatus,
  // Spine interfaces
  type Spine,
  type TreeSpine,
  type LinearSpine,
  type MutableSpine,
  // Validator types
  ValidationPhaseSchema,
  ValidationResultSchema,
  type ValidationPhase,
  type ValidationResult,
  type Validator,
  type ValidatorRegistry,
  // Constraint types
  ConstraintTypeSchema,
  ConstraintSeveritySchema,
  ConstraintSchema,
  ConstraintCheckResultSchema,
  type ConstraintType,
  type ConstraintSeverity,
  type Constraint,
  type ConstraintCheckResult,
  type ConstraintExtractor,
} from './base';
