/**
 * Bible extraction service
 *
 * Uses LLM to detect entities in content and suggest additions/updates to the bible.
 */

import type Database from 'libsql';
import type {
  Bible,
  Content,
  Structure,
  EntitySuggestion,
  SuggestionSummary,
  ExtractionResult,
  ExtractionOptions,
  ExtractionSettings,
  ExtractableEntityType,
  SuggestionStatus,
  AcceptResult,
  ExtractionEvidence,
  FieldUpdate,
} from '@repo/types';
import type { LLMClient } from '@repo/llm';

import { createSuggestionRepository, type SuggestionRepository } from './repository';
import { buildExtractionPrompt, EXTRACTION_SYSTEM_PROMPT } from './prompts';

export interface ExtractionServiceConfig {
  db: Database.Database;
  llm: LLMClient;
}

export interface ExtractionService {
  /** Repository access for direct queries */
  suggestions: SuggestionRepository;

  /** Run extraction on content */
  extract(
    projectId: string,
    contents: Array<{ content: Content; structure: Structure }>,
    bible: Bible,
    settings: ExtractionSettings,
    options?: ExtractionOptions
  ): Promise<ExtractionResult>;

  /** Get all suggestions for a project */
  getSuggestions(projectId: string, status?: SuggestionStatus): EntitySuggestion[];

  /** Get suggestion summaries */
  getSummaries(projectId: string, status?: SuggestionStatus): SuggestionSummary[];

  /** Get a single suggestion */
  getSuggestion(id: string): EntitySuggestion | undefined;

  /** Accept a suggestion (returns info for creating the entity) */
  acceptSuggestion(id: string, reviewNotes?: string): AcceptResult;

  /** Reject a suggestion */
  rejectSuggestion(id: string, reviewNotes?: string): EntitySuggestion | undefined;

  /** Get pending count */
  getPendingCount(projectId: string): number;

  /** Clear reviewed suggestions */
  cleanup(projectId: string, days?: number): number;
}

interface LLMExtractionResponse {
  suggestions: Array<{
    suggestionType: 'new' | 'update';
    entityType: ExtractableEntityType;
    existingEntityId?: string;
    name: string;
    suggestedData?: Record<string, unknown>;
    fieldUpdates?: FieldUpdate[];
    evidence: ExtractionEvidence[];
    confidence: 'low' | 'medium' | 'high';
    reasoning: string;
  }>;
}

/**
 * Parse LLM response to extraction results
 */
function parseExtractionResponse(response: string): LLMExtractionResponse {
  // Try to extract JSON from the response
  let jsonStr = response.trim();

  // Handle markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object if not wrapped
  if (!jsonStr.startsWith('{')) {
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(jsonStr) as LLMExtractionResponse;

    // Validate structure
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      return { suggestions: [] };
    }

    // Filter and validate suggestions
    parsed.suggestions = parsed.suggestions.filter((s) => {
      if (!s.suggestionType || !s.entityType || !s.name) return false;
      if (!['new', 'update'].includes(s.suggestionType)) return false;
      if (
        !['character', 'location', 'faction', 'world-rule', 'plot-thread'].includes(s.entityType)
      ) {
        return false;
      }
      if (!['low', 'medium', 'high'].includes(s.confidence)) {
        s.confidence = 'medium';
      }
      if (!Array.isArray(s.evidence)) {
        s.evidence = [];
      }
      return true;
    });

    return parsed;
  } catch (error) {
    console.error('Failed to parse extraction response:', error);
    return { suggestions: [] };
  }
}

/**
 * Create the extraction service
 */
export function createExtractionService(config: ExtractionServiceConfig): ExtractionService {
  const { db, llm } = config;
  const suggestions = createSuggestionRepository(db);

  return {
    suggestions,

    async extract(
      projectId: string,
      contents: Array<{ content: Content; structure: Structure }>,
      bible: Bible,
      settings: ExtractionSettings,
      options?: ExtractionOptions
    ): Promise<ExtractionResult> {
      const result: ExtractionResult = {
        structuresAnalyzed: [],
        suggestionsCreated: 0,
        byType: { new: 0, update: 0 },
        byEntityType: {},
        errors: [],
      };

      // Determine which entity types to extract
      const entityTypes = options?.entityTypes ||
        settings.autoExtractTypes.map((t) => t as ExtractableEntityType);

      // Filter contents based on options
      let toAnalyze = contents;
      if (options?.structureIds && options.structureIds.length > 0) {
        toAnalyze = contents.filter((c) => options.structureIds!.includes(c.structure.id));
      }

      // Filter out empty content
      toAnalyze = toAnalyze.filter((c) => c.content.text && c.content.text.trim().length > 0);

      for (const { content, structure } of toAnalyze) {
        try {
          result.structuresAnalyzed.push(structure.id);

          // Build the prompt
          const prompt = buildExtractionPrompt(
            content.text,
            structure.title,
            bible,
            settings,
            entityTypes
          );

          // Call LLM
          const response = await llm.complete({
            messages: [
              { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3, // Lower temperature for more consistent extraction
            maxTokens: 4096,
          });

          // Parse response
          const extracted = parseExtractionResponse(response.content);

          // Create suggestions
          for (const suggestion of extracted.suggestions) {
            // Skip updates if disabled
            if (suggestion.suggestionType === 'update' && !settings.suggestUpdates) {
              continue;
            }

            // Add structure ID to evidence
            const evidenceWithStructure = suggestion.evidence.map((e) => ({
              ...e,
              structureId: structure.id,
            }));

            // Create the suggestion
            suggestions.create(projectId, {
              suggestionType: suggestion.suggestionType,
              entityType: suggestion.entityType,
              existingEntityId: suggestion.existingEntityId,
              name: suggestion.name,
              suggestedData: suggestion.suggestedData || {},
              fieldUpdates: suggestion.fieldUpdates,
              evidence: evidenceWithStructure,
              confidence: suggestion.confidence,
              reasoning: suggestion.reasoning,
            });

            result.suggestionsCreated++;

            if (suggestion.suggestionType === 'new') {
              result.byType.new++;
            } else {
              result.byType.update++;
            }

            result.byEntityType[suggestion.entityType] =
              (result.byEntityType[suggestion.entityType] || 0) + 1;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error during extraction';
          result.errors.push(`${structure.title}: ${message}`);
        }
      }

      return result;
    },

    getSuggestions(projectId: string, status?: SuggestionStatus): EntitySuggestion[] {
      return suggestions.getAll(projectId, status);
    },

    getSummaries(projectId: string, status?: SuggestionStatus): SuggestionSummary[] {
      return suggestions.getSummaries(projectId, status);
    },

    getSuggestion(id: string): EntitySuggestion | undefined {
      return suggestions.get(id);
    },

    acceptSuggestion(id: string, reviewNotes?: string): AcceptResult {
      const suggestion = suggestions.get(id);
      if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
      }

      if (suggestion.status !== 'pending') {
        return { success: false, error: `Suggestion already ${suggestion.status}` };
      }

      // Mark as accepted - the caller will create the entity
      suggestions.updateStatus(id, 'accepted', reviewNotes);

      return {
        success: true,
        entityId: suggestion.existingEntityId, // For updates, this is the entity to update
      };
    },

    rejectSuggestion(id: string, reviewNotes?: string): EntitySuggestion | undefined {
      return suggestions.updateStatus(id, 'rejected', reviewNotes);
    },

    getPendingCount(projectId: string): number {
      return suggestions.getPendingCount(projectId);
    },

    cleanup(projectId: string, days = 30): number {
      return suggestions.cleanup(projectId, days);
    },
  };
}
