/**
 * Beat management for story structure
 *
 * Beats are the atomic units of a chapter's outline. Each beat represents
 * a specific moment or development that needs to happen in the narrative.
 *
 * Provides functions for:
 * - Beat CRUD operations
 * - Beat ordering and reordering
 * - Beat completion tracking
 * - Beat validation
 * - Word count estimation
 */

import type { Beat, Structure } from '@repo/serial-types';

import { generateId } from '../storage/repository';

/**
 * Beat creation input
 */
export interface CreateBeatInput {
  /** Description of what happens in this beat */
  description: string;
  /** Optional target word count */
  targetWordCount?: number;
  /** Initial completed state (defaults to false) */
  completed?: boolean;
}

/**
 * Beat update input
 */
export interface UpdateBeatInput {
  description?: string;
  targetWordCount?: number;
  completed?: boolean;
}

/**
 * Beat statistics for a structure
 */
export interface BeatStats {
  /** Total number of beats */
  total: number;
  /** Number of completed beats */
  completed: number;
  /** Number of incomplete beats */
  incomplete: number;
  /** Completion percentage (0-100) */
  completionPercentage: number;
  /** Total target word count across all beats */
  totalTargetWordCount: number;
  /** Average target word count per beat */
  averageTargetWordCount: number;
}

/**
 * Beat validation issue
 */
export interface BeatValidationIssue {
  beatId: string;
  issueType: 'empty_description' | 'duplicate_order' | 'invalid_order' | 'zero_word_count';
  message: string;
}

/**
 * Create a new beat
 *
 * @param input - Beat creation input
 * @param order - Order position for the beat
 * @returns New beat object
 */
export function createBeat(input: CreateBeatInput, order: number): Beat {
  return {
    id: generateId(),
    description: input.description,
    completed: input.completed ?? false,
    targetWordCount: input.targetWordCount,
    order,
  };
}

/**
 * Add a beat to a structure's beat list
 *
 * @param beats - Existing beats array
 * @param input - Beat creation input
 * @returns New beats array with the added beat
 */
export function addBeat(beats: Beat[], input: CreateBeatInput): Beat[] {
  const order = beats.length;
  const newBeat = createBeat(input, order);
  return [...beats, newBeat];
}

/**
 * Insert a beat at a specific position
 *
 * @param beats - Existing beats array
 * @param input - Beat creation input
 * @param position - Position to insert at (0-based)
 * @returns New beats array with inserted beat and updated orders
 */
export function insertBeatAt(
  beats: Beat[],
  input: CreateBeatInput,
  position: number
): Beat[] {
  // Clamp position to valid range
  const safePosition = Math.max(0, Math.min(position, beats.length));

  const newBeat = createBeat(input, safePosition);

  // Update orders of beats at and after the insertion point
  const updatedBeats = beats.map((beat) => {
    if (beat.order >= safePosition) {
      return { ...beat, order: beat.order + 1 };
    }
    return beat;
  });

  // Insert the new beat and sort by order
  return [...updatedBeats, newBeat].sort((a, b) => a.order - b.order);
}

/**
 * Update a beat in the beats array
 *
 * @param beats - Existing beats array
 * @param beatId - ID of beat to update
 * @param updates - Fields to update
 * @returns Updated beats array, or undefined if beat not found
 */
export function updateBeat(
  beats: Beat[],
  beatId: string,
  updates: UpdateBeatInput
): Beat[] | undefined {
  const beatIndex = beats.findIndex((b) => b.id === beatId);
  if (beatIndex === -1) return undefined;

  const updatedBeat = {
    ...beats[beatIndex],
    ...updates,
  };

  const newBeats = [...beats];
  newBeats[beatIndex] = updatedBeat;

  return newBeats;
}

/**
 * Remove a beat from the beats array
 *
 * @param beats - Existing beats array
 * @param beatId - ID of beat to remove
 * @returns New beats array with updated orders, or undefined if beat not found
 */
export function removeBeat(beats: Beat[], beatId: string): Beat[] | undefined {
  const beatIndex = beats.findIndex((b) => b.id === beatId);
  if (beatIndex === -1) return undefined;

  const removedOrder = beats[beatIndex].order;

  // Filter out the removed beat and update orders
  return beats
    .filter((b) => b.id !== beatId)
    .map((beat) => {
      if (beat.order > removedOrder) {
        return { ...beat, order: beat.order - 1 };
      }
      return beat;
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Mark a beat as completed or incomplete
 *
 * @param beats - Existing beats array
 * @param beatId - ID of beat to update
 * @param completed - New completion status
 * @returns Updated beats array, or undefined if beat not found
 */
export function markBeatCompleted(
  beats: Beat[],
  beatId: string,
  completed: boolean
): Beat[] | undefined {
  return updateBeat(beats, beatId, { completed });
}

/**
 * Mark all beats as completed
 *
 * @param beats - Existing beats array
 * @returns New beats array with all beats marked complete
 */
export function markAllBeatsCompleted(beats: Beat[]): Beat[] {
  return beats.map((beat) => ({ ...beat, completed: true }));
}

/**
 * Mark all beats as incomplete
 *
 * @param beats - Existing beats array
 * @returns New beats array with all beats marked incomplete
 */
export function markAllBeatsIncomplete(beats: Beat[]): Beat[] {
  return beats.map((beat) => ({ ...beat, completed: false }));
}

/**
 * Reorder beats according to a new order array
 *
 * @param beats - Existing beats array
 * @param orderedIds - Beat IDs in desired order
 * @returns New beats array with updated orders
 */
export function reorderBeats(beats: Beat[], orderedIds: string[]): Beat[] {
  const beatMap = new Map(beats.map((b) => [b.id, b]));
  const reorderedBeats: Beat[] = [];

  // Add beats in the specified order
  for (let i = 0; i < orderedIds.length; i++) {
    const beat = beatMap.get(orderedIds[i]);
    if (beat) {
      reorderedBeats.push({ ...beat, order: i });
      beatMap.delete(orderedIds[i]);
    }
  }

  // Add any remaining beats (not in orderedIds) at the end
  for (const beat of beatMap.values()) {
    reorderedBeats.push({ ...beat, order: reorderedBeats.length });
  }

  return reorderedBeats.sort((a, b) => a.order - b.order);
}

/**
 * Move a beat to a new position
 *
 * @param beats - Existing beats array
 * @param beatId - ID of beat to move
 * @param newPosition - Target position (0-based)
 * @returns New beats array with updated orders, or undefined if beat not found
 */
export function moveBeat(
  beats: Beat[],
  beatId: string,
  newPosition: number
): Beat[] | undefined {
  const beatIndex = beats.findIndex((b) => b.id === beatId);
  if (beatIndex === -1) return undefined;

  // Create new order array
  const currentIds = beats.sort((a, b) => a.order - b.order).map((b) => b.id);
  const filteredIds = currentIds.filter((id) => id !== beatId);

  // Clamp position to valid range
  const safePosition = Math.max(0, Math.min(newPosition, filteredIds.length));

  // Insert at new position
  filteredIds.splice(safePosition, 0, beatId);

  return reorderBeats(beats, filteredIds);
}

/**
 * Get beat statistics for a structure
 *
 * @param beats - Beats array to analyze
 * @returns Statistics about the beats
 */
export function getBeatStats(beats: Beat[]): BeatStats {
  const total = beats.length;
  const completed = beats.filter((b) => b.completed).length;
  const incomplete = total - completed;
  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const beatsWithWordCount = beats.filter((b) => b.targetWordCount !== undefined);
  const totalTargetWordCount = beatsWithWordCount.reduce(
    (sum, b) => sum + (b.targetWordCount ?? 0),
    0
  );
  const averageTargetWordCount = beatsWithWordCount.length > 0
    ? Math.round(totalTargetWordCount / beatsWithWordCount.length)
    : 0;

  return {
    total,
    completed,
    incomplete,
    completionPercentage,
    totalTargetWordCount,
    averageTargetWordCount,
  };
}

/**
 * Get aggregate beat statistics across multiple structures
 *
 * @param structures - Structures to analyze
 * @returns Aggregated beat statistics
 */
export function getAggregatedBeatStats(structures: Structure[]): BeatStats {
  const allBeats = structures.flatMap((s) => s.beats);
  return getBeatStats(allBeats);
}

/**
 * Validate beats for issues
 *
 * @param beats - Beats array to validate
 * @returns Array of validation issues
 */
export function validateBeats(beats: Beat[]): BeatValidationIssue[] {
  const issues: BeatValidationIssue[] = [];
  const orders = new Set<number>();

  for (const beat of beats) {
    // Check for empty description
    if (!beat.description.trim()) {
      issues.push({
        beatId: beat.id,
        issueType: 'empty_description',
        message: 'Beat has an empty description',
      });
    }

    // Check for duplicate orders
    if (orders.has(beat.order)) {
      issues.push({
        beatId: beat.id,
        issueType: 'duplicate_order',
        message: `Duplicate order value: ${beat.order}`,
      });
    }
    orders.add(beat.order);

    // Check for negative orders
    if (beat.order < 0) {
      issues.push({
        beatId: beat.id,
        issueType: 'invalid_order',
        message: `Invalid negative order: ${beat.order}`,
      });
    }

    // Check for zero word count (if specified)
    if (beat.targetWordCount !== undefined && beat.targetWordCount <= 0) {
      issues.push({
        beatId: beat.id,
        issueType: 'zero_word_count',
        message: 'Target word count must be positive',
      });
    }
  }

  return issues;
}

/**
 * Normalize beat orders to be sequential starting from 0
 *
 * @param beats - Beats array to normalize
 * @returns New beats array with normalized orders
 */
export function normalizeOrders(beats: Beat[]): Beat[] {
  const sorted = [...beats].sort((a, b) => a.order - b.order);
  return sorted.map((beat, index) => ({
    ...beat,
    order: index,
  }));
}

/**
 * Get incomplete beats
 *
 * @param beats - Beats array to filter
 * @returns Incomplete beats in order
 */
export function getIncompleteBeats(beats: Beat[]): Beat[] {
  return beats
    .filter((b) => !b.completed)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get completed beats
 *
 * @param beats - Beats array to filter
 * @returns Completed beats in order
 */
export function getCompletedBeats(beats: Beat[]): Beat[] {
  return beats
    .filter((b) => b.completed)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get the next incomplete beat
 *
 * @param beats - Beats array to search
 * @returns Next incomplete beat or undefined
 */
export function getNextIncompleteBeat(beats: Beat[]): Beat | undefined {
  const sorted = beats.sort((a, b) => a.order - b.order);
  return sorted.find((b) => !b.completed);
}

/**
 * Estimate total word count from beats
 *
 * @param beats - Beats array to estimate
 * @param defaultWordCount - Default word count for beats without a target
 * @returns Estimated total word count
 */
export function estimateTotalWordCount(
  beats: Beat[],
  defaultWordCount: number = 500
): number {
  return beats.reduce(
    (sum, beat) => sum + (beat.targetWordCount ?? defaultWordCount),
    0
  );
}

/**
 * Distribute word count target across beats
 *
 * @param beats - Beats array to update
 * @param totalWordCount - Total word count to distribute
 * @returns New beats array with distributed word counts
 */
export function distributeWordCount(beats: Beat[], totalWordCount: number): Beat[] {
  if (beats.length === 0) return beats;

  const perBeat = Math.floor(totalWordCount / beats.length);
  const remainder = totalWordCount % beats.length;

  return beats.map((beat, index) => ({
    ...beat,
    // Distribute remainder to first few beats
    targetWordCount: perBeat + (index < remainder ? 1 : 0),
  }));
}

/**
 * Clone beats for a new structure (generates new IDs)
 *
 * @param beats - Beats array to clone
 * @param resetCompleted - Whether to reset completed status (defaults to true)
 * @returns New beats array with new IDs
 */
export function cloneBeats(beats: Beat[], resetCompleted: boolean = true): Beat[] {
  return beats.map((beat) => ({
    ...beat,
    id: generateId(),
    completed: resetCompleted ? false : beat.completed,
  }));
}

/**
 * Find beat by ID
 *
 * @param beats - Beats array to search
 * @param beatId - ID of beat to find
 * @returns Beat or undefined
 */
export function findBeatById(beats: Beat[], beatId: string): Beat | undefined {
  return beats.find((b) => b.id === beatId);
}

/**
 * Find beat by order
 *
 * @param beats - Beats array to search
 * @param order - Order position to find
 * @returns Beat or undefined
 */
export function findBeatByOrder(beats: Beat[], order: number): Beat | undefined {
  return beats.find((b) => b.order === order);
}

/**
 * Search beats by description
 *
 * @param beats - Beats array to search
 * @param query - Search query (case-insensitive)
 * @returns Matching beats in order
 */
export function searchBeats(beats: Beat[], query: string): Beat[] {
  const lowerQuery = query.toLowerCase();
  return beats
    .filter((b) => b.description.toLowerCase().includes(lowerQuery))
    .sort((a, b) => a.order - b.order);
}
