// Base entity types
export {
  SpinePositionSchema,
  BaseEntitySchema,
  EntityLifecycleSchema,
  type SpinePosition,
  type BaseEntity,
  type EntityLifecycle,
  type EntityType,
  type EntityRegistry,
} from './entity';

// Base content types
export {
  BaseContentStatusSchema,
  ReferenceSchema,
  BaseContentSchema,
  type BaseContentStatus,
  type Reference,
  type BaseContent,
} from './content';

// Content status transitions
export {
  validTransitions,
  canTransition,
  getValidNextStatuses,
  isTerminalStatus,
  canModify,
  getPreviousStatus,
  getNextStatus,
} from './content-status';

// Spine interfaces
export type { Spine, TreeSpine, LinearSpine, MutableSpine } from './spine';

// Validator types
export {
  ValidationPhaseSchema,
  ValidationResultSchema,
  type ValidationPhase,
  type ValidationResult,
  type Validator,
  type ValidatorRegistry,
} from './validator';

// Constraint types
export {
  ConstraintTypeSchema,
  ConstraintSeveritySchema,
  ConstraintSchema,
  ConstraintCheckResultSchema,
  type ConstraintType,
  type ConstraintSeverity,
  type Constraint,
  type ConstraintCheckResult,
  type ConstraintExtractor,
} from './constraint';
