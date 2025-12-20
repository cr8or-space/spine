/**
 * Bible extraction module
 *
 * Provides LLM-powered entity detection from content.
 */

export { createExtractionService, type ExtractionService, type ExtractionServiceConfig } from './service';
export { createSuggestionRepository, type SuggestionRepository } from './repository';
export { buildExtractionPrompt, EXTRACTION_SYSTEM_PROMPT } from './prompts';
