/**
 * LLM client package
 *
 * OpenAI-compatible API client with streaming support, error handling,
 * token counting utilities, and context assembly for story generation.
 */

// Client
export { createLLMClient, type LLMClient } from './client';

// Resilient client with circuit breaker
export {
  createResilientLLMClient,
  type ResilientLLMClient,
  type ResilientClientConfig,
  type ErrorStats,
} from './resilient-client';

// Circuit breaker
export {
  createCircuitBreaker,
  type CircuitBreaker,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
  CircuitOpenError,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './circuit-breaker';

// Configuration
export {
  type LLMConfig,
  DEFAULT_CONFIG,
  validateConfig,
  mergeConfig,
} from './config';

// Types
export type {
  MessageRole,
  ChatMessage,
  ChatCompletionRequest,
  TokenUsage,
  ChatCompletionChoice,
  ChatCompletionResponse,
  ChatCompletionDelta,
  StreamingChatCompletionChoice,
  StreamingChatCompletionChunk,
  LLMErrorType,
} from './types';

export { LLMError } from './types';

// Token counting
export {
  countTokens,
  countMessageTokens,
  countMessagesTokens,
  estimateCompletionTokens,
  calculateTotalTokens,
  fitsWithinBudget,
  truncateMessages,
} from './token-counter';

// Context assembly
export {
  // Main assembler
  assembleContext,
  formatContext,
  type ContextInput,
  // Budget management
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
  // Relevance scoring
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
  // Summarization
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
  // Constraint extraction
  extractCharacterConstraints,
  extractLocationConstraints,
  extractFactionConstraints,
  extractWorldRuleConstraints,
  extractPlotThreadConstraints,
  extractTimelineConstraints,
  extractAllConstraints,
  fitConstraintsInBudget,
  formatConstraints,
  // Types
  type ContextTaskType,
  type TokenBudget,
  type RelevanceScore,
  type EntityReference,
  type RelevanceContext,
  type Constraint,
  type ContentContext,
  type BibleContext,
  type StructureContext,
  type AssembledContext,
  type ContextAssemblyOptions,
  DEFAULT_BUDGET_ALLOCATIONS,
  DEFAULT_CONTEXT_OPTIONS,
} from './context';
