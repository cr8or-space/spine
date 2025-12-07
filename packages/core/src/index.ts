/**
 * @repo/core - Core domain logic for NovelGen
 *
 * This package contains:
 * - Storage layer (SQLite + file-based)
 * - Repository pattern for all entities
 * - Project management
 * - Auto-save functionality
 *
 * Future packages will be added:
 * - Bible management (CRUD operations, relationships)
 * - Generation pipeline
 * - Analysis engine
 * - Continuity checking
 */

// Re-export storage layer
export * from './storage';
