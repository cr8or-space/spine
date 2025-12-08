import type { BaseContentStatus } from './content';

/**
 * Valid transitions between content statuses.
 *
 * Content follows a linear progression with some backtracking allowed:
 * - draft: Can only move to review
 * - review: Can go back to draft or advance to approved
 * - approved: Can only advance to published
 * - published: Terminal state, no transitions allowed (immutable)
 *
 * @see docs/rationale.md - "Immutable published content" design decision
 */
export const validTransitions: Record<BaseContentStatus, BaseContentStatus[]> = {
  draft: ['review'],
  review: ['draft', 'approved'],
  approved: ['published'],
  published: [], // immutable - no transitions allowed
};

/**
 * Check if a status transition is valid.
 *
 * @param from - Current status
 * @param to - Target status
 * @returns True if the transition is allowed
 *
 * @example
 * ```typescript
 * canTransition('draft', 'review');    // true
 * canTransition('draft', 'approved');  // false - must go through review
 * canTransition('published', 'draft'); // false - published is immutable
 * ```
 */
export function canTransition(from: BaseContentStatus, to: BaseContentStatus): boolean {
  return validTransitions[from].includes(to);
}

/**
 * Get all valid next states for a given status.
 *
 * @param status - Current status
 * @returns Array of valid next statuses
 *
 * @example
 * ```typescript
 * getValidNextStatuses('draft');     // ['review']
 * getValidNextStatuses('review');    // ['draft', 'approved']
 * getValidNextStatuses('published'); // []
 * ```
 */
export function getValidNextStatuses(status: BaseContentStatus): BaseContentStatus[] {
  return validTransitions[status];
}

/**
 * Check if content is in a terminal (immutable) state.
 *
 * @param status - Current status
 * @returns True if no further transitions are allowed
 */
export function isTerminalStatus(status: BaseContentStatus): boolean {
  return validTransitions[status].length === 0;
}

/**
 * Check if content can be modified in its current state.
 *
 * Published content is immutable. All other statuses allow modification.
 *
 * @param status - Current status
 * @returns True if content can be modified
 */
export function canModify(status: BaseContentStatus): boolean {
  return status !== 'published';
}

/**
 * Get the previous status in the workflow (if backtracking is allowed).
 *
 * @param status - Current status
 * @returns Previous status if backtracking is allowed, null otherwise
 */
export function getPreviousStatus(status: BaseContentStatus): BaseContentStatus | null {
  switch (status) {
    case 'review':
      return 'draft';
    case 'approved':
      // approved cannot go back - must be published or stay approved
      return null;
    case 'published':
      // published is immutable
      return null;
    default:
      return null;
  }
}

/**
 * Get the next status in the workflow (the forward progression).
 *
 * @param status - Current status
 * @returns Next status in forward progression, null if terminal
 */
export function getNextStatus(status: BaseContentStatus): BaseContentStatus | null {
  switch (status) {
    case 'draft':
      return 'review';
    case 'review':
      return 'approved';
    case 'approved':
      return 'published';
    default:
      return null;
  }
}
