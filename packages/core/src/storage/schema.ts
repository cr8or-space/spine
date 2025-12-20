/**
 * SQLite database schema for Spine
 *
 * Design decisions:
 * - JSON columns for complex nested structures (traits, relationships, etc.)
 * - Separate tables for each bible entity type for efficient querying
 * - Structure stored hierarchically with parent references
 * - Content versions stored as separate table for efficient versioning
 * - Cross-references tracked in dedicated junction table
 */

export const SCHEMA_VERSION = 3;

/**
 * SQL statements to create all tables
 */
export const CREATE_TABLES_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('short', 'light-novel', 'web-serial')),
  settings_json TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  stats_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at);

-- Characters table
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  traits_json TEXT NOT NULL DEFAULT '[]',
  relationships_json TEXT NOT NULL DEFAULT '[]',
  arc_json TEXT,
  voice_samples_json TEXT NOT NULL DEFAULT '[]',
  appearances_json TEXT NOT NULL DEFAULT '[]',
  role TEXT NOT NULL CHECK (role IN ('protagonist', 'antagonist', 'major', 'supporting', 'minor')),
  status TEXT NOT NULL CHECK (status IN ('active', 'deceased', 'absent', 'unknown')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_role ON characters(project_id, role);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('world', 'continent', 'country', 'region', 'city', 'district', 'building', 'room', 'natural', 'virtual', 'other')),
  parent_id TEXT,
  relations_json TEXT NOT NULL DEFAULT '[]',
  features_json TEXT NOT NULL DEFAULT '[]',
  atmosphere TEXT,
  associated_characters_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('accessible', 'destroyed', 'hidden', 'restricted', 'unknown')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_project ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(project_id, type);

-- Factions table
CREATE TABLE IF NOT EXISTS factions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('government', 'military', 'religious', 'criminal', 'corporate', 'secret-society', 'guild', 'family', 'informal', 'other')),
  ideology TEXT,
  goals_json TEXT NOT NULL DEFAULT '[]',
  ranks_json TEXT NOT NULL DEFAULT '[]',
  members_json TEXT NOT NULL DEFAULT '[]',
  relations_json TEXT NOT NULL DEFAULT '[]',
  locations_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('active', 'disbanded', 'underground', 'emerging', 'unknown')),
  influence TEXT NOT NULL CHECK (influence IN ('dominant', 'major', 'moderate', 'minor', 'negligible')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_factions_project ON factions(project_id);
CREATE INDEX IF NOT EXISTS idx_factions_type ON factions(project_id, type);

-- World rules table
CREATE TABLE IF NOT EXISTS world_rules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('magic', 'technology', 'physics', 'social', 'biological', 'economic', 'political', 'metaphysical', 'other')),
  rule TEXT NOT NULL,
  rationale TEXT,
  exceptions_json TEXT NOT NULL DEFAULT '[]',
  consequences TEXT,
  public_knowledge INTEGER NOT NULL DEFAULT 1,
  related_rules_json TEXT NOT NULL DEFAULT '[]',
  priority INTEGER NOT NULL DEFAULT 50,
  established INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_world_rules_project ON world_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_world_rules_category ON world_rules(project_id, category);

-- Plot threads table
CREATE TABLE IF NOT EXISTS plot_threads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('main-plot', 'subplot', 'mystery', 'romance', 'conflict', 'character-arc', 'worldbuilding', 'other')),
  status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'dormant', 'resolved', 'abandoned')),
  scope TEXT NOT NULL CHECK (scope IN ('scene', 'chapter', 'arc', 'book', 'series')),
  priority INTEGER NOT NULL DEFAULT 50,
  involved_characters_json TEXT NOT NULL DEFAULT '[]',
  related_locations_json TEXT NOT NULL DEFAULT '[]',
  promises_json TEXT NOT NULL DEFAULT '[]',
  touches_json TEXT NOT NULL DEFAULT '[]',
  parent_thread_id TEXT,
  child_threads_json TEXT NOT NULL DEFAULT '[]',
  introduced_at_json TEXT,
  resolved_at_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_thread_id) REFERENCES plot_threads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plot_threads_project ON plot_threads(project_id);
CREATE INDEX IF NOT EXISTS idx_plot_threads_status ON plot_threads(project_id, status);
CREATE INDEX IF NOT EXISTS idx_plot_threads_type ON plot_threads(project_id, type);

-- Timeline events table
CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position_json TEXT NOT NULL,
  duration TEXT,
  type TEXT NOT NULL CHECK (type IN ('backstory', 'flashback', 'current', 'flashforward', 'prophecy', 'hypothetical')),
  significance TEXT NOT NULL CHECK (significance IN ('critical', 'major', 'moderate', 'minor', 'background')),
  involved_characters_json TEXT NOT NULL DEFAULT '[]',
  locations_json TEXT NOT NULL DEFAULT '[]',
  related_threads_json TEXT NOT NULL DEFAULT '[]',
  causes_json TEXT NOT NULL DEFAULT '[]',
  effects_json TEXT NOT NULL DEFAULT '[]',
  revealed INTEGER NOT NULL DEFAULT 0,
  content_refs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_project ON timeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(project_id, type);

-- Timeline spans table
CREATE TABLE IF NOT EXISTS timeline_spans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_json TEXT NOT NULL,
  end_json TEXT,
  events_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_spans_project ON timeline_spans(project_id);

-- Structure table (hierarchical outline)
CREATE TABLE IF NOT EXISTS structures (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('book', 'arc', 'chapter', 'scene')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  beats_json TEXT NOT NULL DEFAULT '[]',
  tension_target INTEGER,
  chapter_type TEXT CHECK (chapter_type IN ('action', 'character', 'worldbuilding', 'dialogue', 'introspection', 'transition', 'climax', 'resolution')),
  hook_json TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT,
  target_word_count INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES structures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_structures_project ON structures(project_id);
CREATE INDEX IF NOT EXISTS idx_structures_parent ON structures(parent_id);
CREATE INDEX IF NOT EXISTS idx_structures_type ON structures(project_id, type);
CREATE INDEX IF NOT EXISTS idx_structures_order ON structures(parent_id, sort_order);

-- Content table (prose attached to structures)
CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  structure_id TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
  analysis_json TEXT,
  reviews_json TEXT NOT NULL DEFAULT '[]',
  generation_history_json TEXT NOT NULL DEFAULT '[]',
  locked INTEGER NOT NULL DEFAULT 0,
  lock_reason TEXT,
  chapter_number INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (structure_id) REFERENCES structures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contents_project ON contents(project_id);
CREATE INDEX IF NOT EXISTS idx_contents_structure ON contents(structure_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(project_id, status);
CREATE INDEX IF NOT EXISTS idx_contents_chapter ON contents(project_id, chapter_number);

-- Content versions table (version history)
CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  text TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('generated', 'edited', 'imported', 'rollback')),
  previous_version INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_versions_unique ON content_versions(content_id, version);
CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_created ON content_versions(created_at);

-- Lock points table
CREATE TABLE IF NOT EXISTS lock_points (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cascade-protection', 'full-lock')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lock_points_project ON lock_points(project_id);
CREATE INDEX IF NOT EXISTS idx_lock_points_content ON lock_points(content_id);

-- Cross-references table (entity mentions in content)
CREATE TABLE IF NOT EXISTS cross_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  context TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cross_refs_project ON cross_references(project_id);
CREATE INDEX IF NOT EXISTS idx_cross_refs_source ON cross_references(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_cross_refs_target ON cross_references(target_id, target_type);

-- Operation journal for recovery
CREATE TABLE IF NOT EXISTS operation_journal (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  state_json TEXT NOT NULL,
  context_json TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_operation_journal_project ON operation_journal(project_id);
CREATE INDEX IF NOT EXISTS idx_operation_journal_status ON operation_journal(status);
CREATE INDEX IF NOT EXISTS idx_operation_journal_type ON operation_journal(operation_type);

-- Database health checks table
CREATE TABLE IF NOT EXISTS health_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'warning', 'error')),
  details_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_health_checks_type ON health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_created ON health_checks(created_at);

-- Backup history table
CREATE TABLE IF NOT EXISTS backup_history (
  id TEXT PRIMARY KEY,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'content-only')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  checksum TEXT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed', 'verified')),
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_backup_history_type ON backup_history(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON backup_history(created_at);

-- Full-text search for characters
CREATE VIRTUAL TABLE IF NOT EXISTS characters_fts USING fts5(
  id UNINDEXED,
  name,
  aliases,
  description,
  content='characters',
  content_rowid='rowid'
);

-- Full-text search for locations
CREATE VIRTUAL TABLE IF NOT EXISTS locations_fts USING fts5(
  id UNINDEXED,
  name,
  aliases,
  description,
  content='locations',
  content_rowid='rowid'
);

-- Full-text search for content
CREATE VIRTUAL TABLE IF NOT EXISTS contents_fts USING fts5(
  id UNINDEXED,
  text,
  content='contents',
  content_rowid='rowid'
);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER IF NOT EXISTS characters_ai AFTER INSERT ON characters BEGIN
  INSERT INTO characters_fts(rowid, id, name, aliases, description)
  VALUES (NEW.rowid, NEW.id, NEW.name, NEW.aliases_json, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS characters_ad AFTER DELETE ON characters BEGIN
  INSERT INTO characters_fts(characters_fts, rowid, id, name, aliases, description)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.name, OLD.aliases_json, OLD.description);
END;

CREATE TRIGGER IF NOT EXISTS characters_au AFTER UPDATE ON characters BEGIN
  INSERT INTO characters_fts(characters_fts, rowid, id, name, aliases, description)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.name, OLD.aliases_json, OLD.description);
  INSERT INTO characters_fts(rowid, id, name, aliases, description)
  VALUES (NEW.rowid, NEW.id, NEW.name, NEW.aliases_json, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS locations_ai AFTER INSERT ON locations BEGIN
  INSERT INTO locations_fts(rowid, id, name, aliases, description)
  VALUES (NEW.rowid, NEW.id, NEW.name, NEW.aliases_json, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS locations_ad AFTER DELETE ON locations BEGIN
  INSERT INTO locations_fts(locations_fts, rowid, id, name, aliases, description)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.name, OLD.aliases_json, OLD.description);
END;

CREATE TRIGGER IF NOT EXISTS locations_au AFTER UPDATE ON locations BEGIN
  INSERT INTO locations_fts(locations_fts, rowid, id, name, aliases, description)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.name, OLD.aliases_json, OLD.description);
  INSERT INTO locations_fts(rowid, id, name, aliases, description)
  VALUES (NEW.rowid, NEW.id, NEW.name, NEW.aliases_json, NEW.description);
END;

CREATE TRIGGER IF NOT EXISTS contents_ai AFTER INSERT ON contents BEGIN
  INSERT INTO contents_fts(rowid, id, text)
  VALUES (NEW.rowid, NEW.id, NEW.text);
END;

CREATE TRIGGER IF NOT EXISTS contents_ad AFTER DELETE ON contents BEGIN
  INSERT INTO contents_fts(contents_fts, rowid, id, text)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.text);
END;

CREATE TRIGGER IF NOT EXISTS contents_au AFTER UPDATE ON contents BEGIN
  INSERT INTO contents_fts(contents_fts, rowid, id, text)
  VALUES ('delete', OLD.rowid, OLD.id, OLD.text);
  INSERT INTO contents_fts(rowid, id, text)
  VALUES (NEW.rowid, NEW.id, NEW.text);
END;
`;

/**
 * Drop all tables (for testing/reset)
 */
export const DROP_TABLES_SQL = `
DROP TRIGGER IF EXISTS contents_au;
DROP TRIGGER IF EXISTS contents_ad;
DROP TRIGGER IF EXISTS contents_ai;
DROP TRIGGER IF EXISTS locations_au;
DROP TRIGGER IF EXISTS locations_ad;
DROP TRIGGER IF EXISTS locations_ai;
DROP TRIGGER IF EXISTS characters_au;
DROP TRIGGER IF EXISTS characters_ad;
DROP TRIGGER IF EXISTS characters_ai;
DROP TABLE IF EXISTS contents_fts;
DROP TABLE IF EXISTS locations_fts;
DROP TABLE IF EXISTS characters_fts;
DROP TABLE IF EXISTS backup_history;
DROP TABLE IF EXISTS health_checks;
DROP TABLE IF EXISTS operation_journal;
DROP TABLE IF EXISTS cross_references;
DROP TABLE IF EXISTS lock_points;
DROP TABLE IF EXISTS content_versions;
DROP TABLE IF EXISTS contents;
DROP TABLE IF EXISTS structures;
DROP TABLE IF EXISTS timeline_spans;
DROP TABLE IF EXISTS timeline_events;
DROP TABLE IF EXISTS plot_threads;
DROP TABLE IF EXISTS world_rules;
DROP TABLE IF EXISTS factions;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS schema_version;
`;
