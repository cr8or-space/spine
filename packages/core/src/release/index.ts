/**
 * Release planning module for NovelGen
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
} from './release-planning';
