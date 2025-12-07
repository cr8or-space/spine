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
 *
 * Future packages will be added:
 * - Analysis engine
 * - Continuity checking
 */

// Re-export storage layer
export * from './storage';

// Re-export bible management
export * from './bible';

// Re-export structure management
export * from './structure';

// Re-export generation pipeline
export * from './generation';
