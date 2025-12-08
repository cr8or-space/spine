/**
 * @repo/core - Core domain logic for NovelGen
 *
 * This package contains:
 * - Storage layer (SQLite + file-based)
 * - Repository pattern for all entities
 * - Project management
 * - Auto-save functionality
 * - Bible management (CRUD operations, relationships)
 * - Structure management (outline hierarchy, beats, hooks)
 * - Generation pipeline (outline → beats → draft → review)
 * - Analysis engine (tension, hooks, pacing, continuity)
 * - Version management (diff generation, history, rollback)
 */

// Re-export storage layer
export * from './storage';

// Re-export bible management
export * from './bible';

// Re-export structure management
export * from './structure';

// Re-export generation pipeline
export * from './generation';

// Re-export analysis engine
export * from './analysis';

// Re-export version management
export * from './version';

// Re-export review workflow
export * from './review';

// Re-export revision cascade
export * from './continuity';

// Re-export release planning (Phase 5.3)
export * from './release';

// Re-export render pipeline (Phase 7.VR.4)
export * from './render';
