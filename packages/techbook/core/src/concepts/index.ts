/**
 * Concept management for TechBook domain.
 *
 * Provides:
 * - ConceptRegistry: CRUD operations for concepts
 * - ConceptGraph: Dependency analysis and validation
 * - SymbolRegistry: Symbol-to-concept linking
 */

// Registry
export {
  createConceptRegistry,
  type ConceptRegistry,
  type CreateConceptData,
  type UpdateConceptData,
} from './registry';

// Dependencies
export {
  createConceptGraph,
  wouldCreateCycle,
  getValidPrerequisites,
  type ConceptGraph,
} from './dependencies';

// Symbols
export {
  createSymbolRegistry,
  validateSymbols,
  extractSymbolsFromCode,
  suggestConceptsForSymbol,
  type SymbolRegistry,
  type SymbolValidationResult,
  type PrematureSymbolUse,
  type UnexplainedSymbol,
  type OrphanedLink,
  type SnippetInfo,
} from './symbols';
