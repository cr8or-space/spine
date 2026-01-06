/**
 * Framework Core
 *
 * Domain-agnostic infrastructure for spine-based authoring tools.
 *
 * Currently a placeholder - will be populated as code is extracted
 * from serial/core that is generic enough for all domains.
 *
 * Planned exports:
 * - storage/ - SQLite schema, repository base classes, migrations
 * - entity/ - Entity registry, relationship graph, lifecycle tracking
 * - content/ - Content storage, version tracking, reference indexing
 * - validation/ - Pipeline orchestration, result aggregation
 * - spine/ - Base spine implementations, checkpoint management
 */

// Re-export types for convenience
export * from '@repo/framework-types';

// Placeholder exports for future framework-level implementations
export const FRAMEWORK_VERSION = '0.0.0';
