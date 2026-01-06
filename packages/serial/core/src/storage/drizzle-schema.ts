/**
 * Drizzle ORM schema definitions for Spine
 *
 * This provides type-safe queries while maintaining the same database structure
 * as the existing schema.ts (which remains for raw SQL migrations and FTS5).
 */

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Schema version tracking
 */
export const schemaVersion = sqliteTable('schema_version', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at').notNull(),
});

/**
 * Projects table
 */
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    format: text('format', { enum: ['short', 'light-novel', 'web-serial'] }).notNull(),
    settingsJson: text('settings_json').notNull(),
    metadataJson: text('metadata_json').notNull(),
    statsJson: text('stats_json'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_projects_updated').on(table.updatedAt)]
);

/**
 * Characters table
 */
export const characters = sqliteTable(
  'characters',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aliasesJson: text('aliases_json').notNull().default('[]'),
    description: text('description').notNull().default(''),
    traitsJson: text('traits_json').notNull().default('[]'),
    relationshipsJson: text('relationships_json').notNull().default('[]'),
    arcJson: text('arc_json'),
    voiceSamplesJson: text('voice_samples_json').notNull().default('[]'),
    appearancesJson: text('appearances_json').notNull().default('[]'),
    role: text('role', { enum: ['protagonist', 'antagonist', 'major', 'supporting', 'minor'] }).notNull(),
    status: text('status', { enum: ['active', 'deceased', 'absent', 'unknown'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_characters_project').on(table.projectId),
    index('idx_characters_name').on(table.name),
    index('idx_characters_role').on(table.projectId, table.role),
  ]
);

/**
 * Locations table
 */
export const locations = sqliteTable(
  'locations',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aliasesJson: text('aliases_json').notNull().default('[]'),
    description: text('description').notNull().default(''),
    type: text('type', {
      enum: ['world', 'continent', 'country', 'region', 'city', 'district', 'building', 'room', 'natural', 'virtual', 'other'],
    }).notNull(),
    parentId: text('parent_id'),
    relationsJson: text('relations_json').notNull().default('[]'),
    featuresJson: text('features_json').notNull().default('[]'),
    atmosphere: text('atmosphere'),
    associatedCharactersJson: text('associated_characters_json').notNull().default('[]'),
    status: text('status', { enum: ['accessible', 'destroyed', 'hidden', 'restricted', 'unknown'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_locations_project').on(table.projectId),
    index('idx_locations_parent').on(table.parentId),
    index('idx_locations_type').on(table.projectId, table.type),
  ]
);

/**
 * Factions table
 */
export const factions = sqliteTable(
  'factions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    aliasesJson: text('aliases_json').notNull().default('[]'),
    description: text('description').notNull().default(''),
    type: text('type', {
      enum: ['government', 'military', 'religious', 'criminal', 'corporate', 'secret-society', 'guild', 'family', 'informal', 'other'],
    }).notNull(),
    ideology: text('ideology'),
    goalsJson: text('goals_json').notNull().default('[]'),
    ranksJson: text('ranks_json').notNull().default('[]'),
    membersJson: text('members_json').notNull().default('[]'),
    relationsJson: text('relations_json').notNull().default('[]'),
    locationsJson: text('locations_json').notNull().default('[]'),
    status: text('status', { enum: ['active', 'disbanded', 'underground', 'emerging', 'unknown'] }).notNull(),
    influence: text('influence', { enum: ['dominant', 'major', 'moderate', 'minor', 'negligible'] }).notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_factions_project').on(table.projectId), index('idx_factions_type').on(table.projectId, table.type)]
);

/**
 * World rules table
 */
export const worldRules = sqliteTable(
  'world_rules',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    category: text('category', {
      enum: ['magic', 'technology', 'physics', 'social', 'biological', 'economic', 'political', 'metaphysical', 'other'],
    }).notNull(),
    rule: text('rule').notNull(),
    rationale: text('rationale'),
    exceptionsJson: text('exceptions_json').notNull().default('[]'),
    consequences: text('consequences'),
    publicKnowledge: integer('public_knowledge', { mode: 'boolean' }).notNull().default(true),
    relatedRulesJson: text('related_rules_json').notNull().default('[]'),
    priority: integer('priority').notNull().default(50),
    established: integer('established', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_world_rules_project').on(table.projectId),
    index('idx_world_rules_category').on(table.projectId, table.category),
  ]
);

/**
 * Plot threads table
 */
export const plotThreads = sqliteTable(
  'plot_threads',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    type: text('type', {
      enum: ['main-plot', 'subplot', 'mystery', 'romance', 'conflict', 'character-arc', 'worldbuilding', 'other'],
    }).notNull(),
    status: text('status', { enum: ['planned', 'active', 'dormant', 'resolved', 'abandoned'] }).notNull(),
    scope: text('scope', { enum: ['scene', 'chapter', 'arc', 'book', 'series'] }).notNull(),
    priority: integer('priority').notNull().default(50),
    involvedCharactersJson: text('involved_characters_json').notNull().default('[]'),
    relatedLocationsJson: text('related_locations_json').notNull().default('[]'),
    promisesJson: text('promises_json').notNull().default('[]'),
    touchesJson: text('touches_json').notNull().default('[]'),
    parentThreadId: text('parent_thread_id'),
    childThreadsJson: text('child_threads_json').notNull().default('[]'),
    introducedAtJson: text('introduced_at_json'),
    resolvedAtJson: text('resolved_at_json'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_plot_threads_project').on(table.projectId),
    index('idx_plot_threads_status').on(table.projectId, table.status),
    index('idx_plot_threads_type').on(table.projectId, table.type),
  ]
);

/**
 * Timeline events table
 */
export const timelineEvents = sqliteTable(
  'timeline_events',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    positionJson: text('position_json').notNull(),
    duration: text('duration'),
    type: text('type', { enum: ['backstory', 'flashback', 'current', 'flashforward', 'prophecy', 'hypothetical'] }).notNull(),
    significance: text('significance', { enum: ['critical', 'major', 'moderate', 'minor', 'background'] }).notNull(),
    involvedCharactersJson: text('involved_characters_json').notNull().default('[]'),
    locationsJson: text('locations_json').notNull().default('[]'),
    relatedThreadsJson: text('related_threads_json').notNull().default('[]'),
    causesJson: text('causes_json').notNull().default('[]'),
    effectsJson: text('effects_json').notNull().default('[]'),
    revealed: integer('revealed', { mode: 'boolean' }).notNull().default(false),
    contentRefsJson: text('content_refs_json').notNull().default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_timeline_events_project').on(table.projectId),
    index('idx_timeline_events_type').on(table.projectId, table.type),
  ]
);

/**
 * Timeline spans table
 */
export const timelineSpans = sqliteTable(
  'timeline_spans',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    startJson: text('start_json').notNull(),
    endJson: text('end_json'),
    eventsJson: text('events_json').notNull().default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_timeline_spans_project').on(table.projectId)]
);

/**
 * Structure table (hierarchical outline)
 */
export const structures = sqliteTable(
  'structures',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['book', 'arc', 'chapter', 'scene'] }).notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    beatsJson: text('beats_json').notNull().default('[]'),
    tensionTarget: integer('tension_target'),
    chapterType: text('chapter_type', {
      enum: ['action', 'character', 'worldbuilding', 'dialogue', 'introspection', 'transition', 'climax', 'resolution'],
    }),
    hookJson: text('hook_json'),
    sortOrder: integer('sort_order').notNull().default(0),
    parentId: text('parent_id'),
    targetWordCount: integer('target_word_count'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_structures_project').on(table.projectId),
    index('idx_structures_parent').on(table.parentId),
    index('idx_structures_type').on(table.projectId, table.type),
    index('idx_structures_order').on(table.parentId, table.sortOrder),
  ]
);

/**
 * Content table (prose attached to structures)
 */
export const contents = sqliteTable(
  'contents',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    structureId: text('structure_id')
      .notNull()
      .references(() => structures.id, { onDelete: 'cascade' }),
    currentVersion: integer('current_version').notNull().default(1),
    text: text('text').notNull().default(''),
    status: text('status', { enum: ['draft', 'review', 'approved', 'published'] })
      .notNull()
      .default('draft'),
    analysisJson: text('analysis_json'),
    reviewsJson: text('reviews_json').notNull().default('[]'),
    generationHistoryJson: text('generation_history_json').notNull().default('[]'),
    locked: integer('locked', { mode: 'boolean' }).notNull().default(false),
    lockReason: text('lock_reason'),
    chapterNumber: integer('chapter_number'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    publishedAt: text('published_at'),
  },
  (table) => [
    index('idx_contents_project').on(table.projectId),
    index('idx_contents_structure').on(table.structureId),
    index('idx_contents_status').on(table.projectId, table.status),
    index('idx_contents_chapter').on(table.projectId, table.chapterNumber),
  ]
);

/**
 * Content versions table (version history)
 */
export const contentVersions = sqliteTable(
  'content_versions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    contentId: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    text: text('text').notNull(),
    wordCount: integer('word_count').notNull().default(0),
    source: text('source', { enum: ['generated', 'edited', 'imported', 'rollback'] }).notNull(),
    previousVersion: integer('previous_version'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_content_versions_content').on(table.contentId), index('idx_content_versions_created').on(table.createdAt)]
);

/**
 * Lock points table
 */
export const lockPoints = sqliteTable(
  'lock_points',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    contentId: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    type: text('type', { enum: ['cascade-protection', 'full-lock'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_lock_points_project').on(table.projectId), index('idx_lock_points_content').on(table.contentId)]
);

/**
 * Cross-references table (entity mentions in content)
 */
export const crossReferences = sqliteTable(
  'cross_references',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceId: text('source_id').notNull(),
    sourceType: text('source_type').notNull(),
    targetId: text('target_id').notNull(),
    targetType: text('target_type').notNull(),
    context: text('context'),
  },
  (table) => [
    index('idx_cross_refs_project').on(table.projectId),
    index('idx_cross_refs_source').on(table.sourceId, table.sourceType),
    index('idx_cross_refs_target').on(table.targetId, table.targetType),
  ]
);

/**
 * Type exports for inferring select/insert types
 */
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type CharacterRow = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export type LocationRow = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type FactionRow = typeof factions.$inferSelect;
export type NewFaction = typeof factions.$inferInsert;

export type WorldRuleRow = typeof worldRules.$inferSelect;
export type NewWorldRule = typeof worldRules.$inferInsert;

export type PlotThreadRow = typeof plotThreads.$inferSelect;
export type NewPlotThread = typeof plotThreads.$inferInsert;

export type TimelineEventRow = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;

export type TimelineSpanRow = typeof timelineSpans.$inferSelect;
export type NewTimelineSpan = typeof timelineSpans.$inferInsert;

export type StructureRow = typeof structures.$inferSelect;
export type NewStructure = typeof structures.$inferInsert;

export type ContentRow = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;

export type ContentVersionRow = typeof contentVersions.$inferSelect;
export type NewContentVersion = typeof contentVersions.$inferInsert;

export type LockPointRow = typeof lockPoints.$inferSelect;
export type NewLockPoint = typeof lockPoints.$inferInsert;

export type CrossReferenceRow = typeof crossReferences.$inferSelect;
export type NewCrossReference = typeof crossReferences.$inferInsert;
