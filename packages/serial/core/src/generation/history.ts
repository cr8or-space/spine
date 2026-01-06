/**
 * Generation history tracking
 *
 * Manages history of generation attempts for analytics and debugging.
 */

import { nanoid } from 'nanoid';
import type { GenerationRecord } from '@repo/serial-types';

import type {
  GenerationHistoryEntry,
  GenerationOptions,
  GenerationStage,
  PipelineState,
} from './types';

/**
 * In-memory generation history store
 */
export interface GenerationHistoryStore {
  /** Add a history entry */
  add(entry: GenerationHistoryEntry): void;

  /** Get entry by ID */
  get(id: string): GenerationHistoryEntry | undefined;

  /** Get entries for a content ID */
  getForContent(contentId: string): GenerationHistoryEntry[];

  /** Get entries for a structure ID */
  getForStructure(structureId: string): GenerationHistoryEntry[];

  /** Get recent entries */
  getRecent(limit?: number): GenerationHistoryEntry[];

  /** Get failed entries */
  getFailed(limit?: number): GenerationHistoryEntry[];

  /** Get all entries */
  getAll(): GenerationHistoryEntry[];

  /** Clear all entries */
  clear(): void;

  /** Get statistics */
  getStats(): GenerationStats;
}

/**
 * Generation statistics
 */
export interface GenerationStats {
  /** Total generation attempts */
  totalAttempts: number;
  /** Successful generations */
  successCount: number;
  /** Failed generations */
  failureCount: number;
  /** Success rate (0-100) */
  successRate: number;
  /** Average duration in milliseconds */
  averageDurationMs: number;
  /** Total tokens used */
  totalTokens: {
    prompt: number;
    completion: number;
  };
  /** Failures by stage */
  failuresByStage: Record<GenerationStage, number>;
  /** Average tokens per generation */
  averageTokensPerGeneration: {
    prompt: number;
    completion: number;
  };
}

/**
 * Create an in-memory generation history store
 */
export function createGenerationHistoryStore(): GenerationHistoryStore {
  const entries: Map<string, GenerationHistoryEntry> = new Map();
  const byContent: Map<string, Set<string>> = new Map();
  const byStructure: Map<string, Set<string>> = new Map();

  return {
    add(entry: GenerationHistoryEntry): void {
      entries.set(entry.id, entry);

      // Index by content
      if (entry.contentId) {
        if (!byContent.has(entry.contentId)) {
          byContent.set(entry.contentId, new Set());
        }
        byContent.get(entry.contentId)!.add(entry.id);
      }

      // Index by structure
      if (!byStructure.has(entry.structureId)) {
        byStructure.set(entry.structureId, new Set());
      }
      byStructure.get(entry.structureId)!.add(entry.id);
    },

    get(id: string): GenerationHistoryEntry | undefined {
      return entries.get(id);
    },

    getForContent(contentId: string): GenerationHistoryEntry[] {
      const ids = byContent.get(contentId);
      if (!ids) return [];
      return Array.from(ids)
        .map((id) => entries.get(id))
        .filter((e): e is GenerationHistoryEntry => e !== undefined)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    getForStructure(structureId: string): GenerationHistoryEntry[] {
      const ids = byStructure.get(structureId);
      if (!ids) return [];
      return Array.from(ids)
        .map((id) => entries.get(id))
        .filter((e): e is GenerationHistoryEntry => e !== undefined)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    getRecent(limit = 10): GenerationHistoryEntry[] {
      return Array.from(entries.values())
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, limit);
    },

    getFailed(limit = 10): GenerationHistoryEntry[] {
      return Array.from(entries.values())
        .filter((e) => !e.success)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, limit);
    },

    getAll(): GenerationHistoryEntry[] {
      return Array.from(entries.values()).sort((a, b) =>
        b.startedAt.localeCompare(a.startedAt)
      );
    },

    clear(): void {
      entries.clear();
      byContent.clear();
      byStructure.clear();
    },

    getStats(): GenerationStats {
      const all = Array.from(entries.values());
      const successful = all.filter((e) => e.success);
      const failed = all.filter((e) => !e.success);

      // Calculate totals
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalDuration = 0;

      for (const entry of all) {
        totalPromptTokens += entry.totalTokens.prompt;
        totalCompletionTokens += entry.totalTokens.completion;
        totalDuration += entry.totalDurationMs;
      }

      // Count failures by stage
      const failuresByStage: Record<GenerationStage, number> = {
        outline: 0,
        beats: 0,
        draft: 0,
        revision: 0,
        'self-review': 0,
      };

      for (const entry of failed) {
        if (entry.error?.stage) {
          failuresByStage[entry.error.stage]++;
        } else {
          failuresByStage[entry.finalStage]++;
        }
      }

      const count = all.length || 1; // Prevent division by zero

      return {
        totalAttempts: all.length,
        successCount: successful.length,
        failureCount: failed.length,
        successRate: all.length > 0 ? (successful.length / all.length) * 100 : 0,
        averageDurationMs: totalDuration / count,
        totalTokens: {
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
        },
        failuresByStage,
        averageTokensPerGeneration: {
          prompt: totalPromptTokens / count,
          completion: totalCompletionTokens / count,
        },
      };
    },
  };
}

/**
 * Create a history entry from pipeline state
 */
export function createHistoryEntry(
  structureId: string,
  contentId: string | undefined,
  state: PipelineState,
  options: GenerationOptions,
  modelId: string
): GenerationHistoryEntry {
  // Calculate total tokens and duration from stage results
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalDurationMs = 0;

  for (const result of Object.values(state.stageResults)) {
    if (result) {
      totalPromptTokens += result.tokens.prompt;
      totalCompletionTokens += result.tokens.completion;
      totalDurationMs += result.durationMs;
    }
  }

  // Determine final stage (last completed or failed stage)
  let finalStage: GenerationStage = 'outline';
  const stageOrder: GenerationStage[] = ['outline', 'beats', 'draft', 'self-review', 'revision'];

  for (const stage of stageOrder) {
    if (
      state.stageStatuses[stage] === 'completed' ||
      state.stageStatuses[stage] === 'failed'
    ) {
      finalStage = stage;
    }
  }

  return {
    id: nanoid(),
    contentId: contentId || '',
    structureId,
    startedAt: state.startedAt,
    completedAt: state.completedAt,
    success: !state.error,
    finalStage,
    totalTokens: {
      prompt: totalPromptTokens,
      completion: totalCompletionTokens,
    },
    totalDurationMs,
    modelId,
    options,
    error: state.error,
  };
}

/**
 * Convert history entry to generation record for storage
 */
export function historyEntryToRecord(entry: GenerationHistoryEntry): GenerationRecord {
  return {
    id: entry.id,
    contentId: entry.contentId,
    version: 1,
    modelId: entry.modelId,
    temperature: entry.options.temperature || 0.7,
    tokens: entry.totalTokens,
    durationMs: entry.totalDurationMs,
    stage: entry.finalStage,
    success: entry.success,
    error: entry.error?.message,
    createdAt: entry.completedAt || entry.startedAt,
  };
}
