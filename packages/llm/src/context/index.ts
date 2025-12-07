/**
 * Context assembly module
 *
 * Provides tools for building LLM prompts with relevant story context
 * while staying within token budgets.
 */

// Main assembler
export { assembleContext, formatContext, type ContextInput } from './assembler';

// Budget management
export {
  calculateBudget,
  budgetFromOptions,
  fitsInBudget,
  remainingBudget,
  redistributeBudget,
  calculateTrimming,
  getModelBudget,
  getBudgetForModel,
  MODEL_CONTEXT_SIZES,
  SECTION_PRIORITY,
} from './budget';

// Relevance scoring
export {
  scoreCharacter,
  scoreLocation,
  scoreFaction,
  scoreWorldRule,
  scorePlotThread,
  scoreAllEntities,
  filterByRelevance,
  topNByRelevance,
  toEntityReference,
  type ScoredEntities,
} from './relevance';

// Summarization
export {
  summarizeCharacter,
  summarizeLocation,
  summarizeFaction,
  summarizeWorldRule,
  summarizePlotThread,
  summarizeContent,
  summarizeStructure,
  truncateContentText,
  calculateEntityTokens,
  calculateSummaryTokens,
  selectEntityOrSummary,
} from './summarize';

// Constraint extraction
export {
  extractCharacterConstraints,
  extractLocationConstraints,
  extractFactionConstraints,
  extractWorldRuleConstraints,
  extractPlotThreadConstraints,
  extractTimelineConstraints,
  extractAllConstraints,
  fitConstraintsInBudget,
  formatConstraints,
} from './constraints';

// Types
export type {
  ContextTaskType,
  TokenBudget,
  RelevanceScore,
  EntityReference,
  RelevanceContext,
  Constraint,
  ContentContext,
  BibleContext,
  StructureContext,
  AssembledContext,
  ContextAssemblyOptions,
} from './types';

export { DEFAULT_BUDGET_ALLOCATIONS, DEFAULT_CONTEXT_OPTIONS } from './types';
