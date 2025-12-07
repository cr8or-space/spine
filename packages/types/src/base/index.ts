// Base entity types
export {
  SpinePositionSchema,
  BaseEntitySchema,
  type SpinePosition,
  type BaseEntity,
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

// Spine interfaces
export type { Spine, TreeSpine, MutableSpine } from './spine';

// Validator types
export {
  ValidationPhaseSchema,
  ValidationResultSchema,
  type ValidationPhase,
  type ValidationResult,
  type Validator,
  type ValidatorRegistry,
} from './validator';
