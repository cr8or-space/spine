/**
 * Generic SQLite schema for spine-based authoring tools.
 *
 * This schema provides tables that any domain can use:
 * - Projects with metadata
 * - Entities with type-based polymorphism
 * - Content with versioning
 * - References for entity tracking
 * - Validation results
 *
 * Domain-specific tables should be added by domains using migrations.
 */

/**
 * Current schema version.
 * Increment this when making schema changes.
 */
export const SCHEMA_VERSION = 1;

/**
 * SQL to create all framework tables.
 */
export const CREATE_TABLES_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects table - the top-level container
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL,
  settings_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_domain ON projects(domain);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);

-- Entities table - polymorphic storage for all entity types
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data_json TEXT NOT NULL,
  introduced_at_node TEXT,
  introduced_at_order INTEGER,
  retired_at_node TEXT,
  retired_at_order INTEGER,
  lifecycle TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle IN ('active', 'retired', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entities_project ON entities(project_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(project_id, type);
CREATE INDEX IF NOT EXISTS idx_entities_lifecycle ON entities(project_id, lifecycle);

-- Entity relationships (graph edges)
CREATE TABLE IF NOT EXISTS entity_relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_relationships_project ON entity_relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_type ON entity_relationships(relationship_type);

-- Spine nodes table - stores the structure hierarchy
CREATE TABLE IF NOT EXISTS spine_nodes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  data_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES spine_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_spine_nodes_project ON spine_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_spine_nodes_parent ON spine_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_spine_nodes_type ON spine_nodes(project_id, type);
CREATE INDEX IF NOT EXISTS idx_spine_nodes_order ON spine_nodes(parent_id, order_index);

-- Content table - stores authored content attached to spine nodes
CREATE TABLE IF NOT EXISTS content (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  spine_node_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (spine_node_id) REFERENCES spine_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_project ON content(project_id);
CREATE INDEX IF NOT EXISTS idx_content_spine_node ON content(spine_node_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(project_id, type);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(project_id, status);

-- Content versions for history tracking
CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'generation', 'import', 'rollback')),
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_number ON content_versions(content_id, version_number);
CREATE INDEX IF NOT EXISTS idx_content_versions_created ON content_versions(created_at);

-- References - tracks entity mentions in content
CREATE TABLE IF NOT EXISTS content_references (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  position_start INTEGER NOT NULL,
  position_end INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_references_content ON content_references(content_id);
CREATE INDEX IF NOT EXISTS idx_content_references_entity ON content_references(entity_id);

-- Constraints extracted from entities
CREATE TABLE IF NOT EXISTS constraints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_entity_id TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('fact', 'rule', 'relationship', 'timeline', 'style', 'structural')),
  statement TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('error', 'warning', 'info')),
  active INTEGER NOT NULL DEFAULT 1,
  scope_after TEXT,
  scope_before TEXT,
  scope_content_types_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_constraints_project ON constraints(project_id);
CREATE INDEX IF NOT EXISTS idx_constraints_source ON constraints(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_constraints_type ON constraints(constraint_type);
CREATE INDEX IF NOT EXISTS idx_constraints_active ON constraints(project_id, active);

-- Validation results
CREATE TABLE IF NOT EXISTS validation_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content_id TEXT,
  constraint_id TEXT,
  validator_name TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('structural', 'automated', 'computed')),
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warn')),
  message TEXT NOT NULL,
  location_node TEXT,
  location_order INTEGER,
  fix_suggestion TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES content(id) ON DELETE SET NULL,
  FOREIGN KEY (constraint_id) REFERENCES constraints(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_validation_results_project ON validation_results(project_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_content ON validation_results(content_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_status ON validation_results(project_id, status);
CREATE INDEX IF NOT EXISTS idx_validation_results_phase ON validation_results(phase);
CREATE INDEX IF NOT EXISTS idx_validation_results_created ON validation_results(created_at);

-- Checkpoints - named validation points in the spine
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  spine_node_id TEXT NOT NULL,
  description TEXT,
  locked INTEGER NOT NULL DEFAULT 0,
  locked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (spine_node_id) REFERENCES spine_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_project ON checkpoints(project_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_name ON checkpoints(project_id, name);
CREATE INDEX IF NOT EXISTS idx_checkpoints_node ON checkpoints(spine_node_id);
`;

/**
 * SQL to drop all framework tables.
 * Used for testing and reset operations.
 */
export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS checkpoints;
DROP TABLE IF EXISTS validation_results;
DROP TABLE IF EXISTS constraints;
DROP TABLE IF EXISTS content_references;
DROP TABLE IF EXISTS content_versions;
DROP TABLE IF EXISTS content;
DROP TABLE IF EXISTS spine_nodes;
DROP TABLE IF EXISTS entity_relationships;
DROP TABLE IF EXISTS entities;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS schema_version;
`;
