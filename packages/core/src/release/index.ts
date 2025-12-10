/**
 * Release planning module for Spine
 *
 * Provides web serial release management:
 * - Schedule configuration
 * - Buffer calculation (approved chapters - scheduled)
 * - Buffer depletion projection
 * - Deadline tracking
 *
 * Phase 5.3 implementation
 */

export {
  analyzeReleasePlanning,
  analyzeReleasePlanningWithDeps,
  calculateBufferDepletion,
  calculateBufferStatus,
  calculateChaptersNeeded,
  DEFAULT_RELEASE_PLANNING_CONFIG,
  extractChapterReleaseDataPoints,
  extractChaptersInOrder,
  generateReleaseWarnings,
  generateScheduledReleases,
  getNextReleaseDate,
  getReleasePlanningSummary,
  suggestReleaseInterval,
  validateReleaseScheduleConfig,
  type ReleasePlanningDependencies,
  type ReleasePlanningInput,
} from './release-planning';
