/**
 * Project service - coordinates save/load operations across all repositories
 */

import type Database from 'libsql';

import {
  createDefaultSettings,
  createEmptyBible,
  type Bible,
  type Project,
  type ProjectFormat,
  type ProjectMetadata,
  type ProjectSettings,
  type ProjectStats,
  type ProjectSummary,
  type Structure,
} from '@repo/types';

import { nowTimestamp } from './repository';
import {
  createCharacterRepository,
  createContentRepository,
  createFactionRepository,
  createLocationRepository,
  createPlotThreadRepository,
  createProjectRepository,
  createStructureRepository,
  createTimelineEventRepository,
  createTimelineSpanRepository,
  createWorldRuleRepository,
  type CharacterRepository,
  type ContentRepository,
  type FactionRepository,
  type LocationRepository,
  type PlotThreadRepository,
  type ProjectRepository,
  type StructureRepository,
  type TimelineEventRepository,
  type TimelineSpanRepository,
  type WorldRuleRepository,
} from './repositories';

/**
 * Complete set of repositories for a project
 */
export interface ProjectRepositories {
  projects: ProjectRepository;
  characters: CharacterRepository;
  locations: LocationRepository;
  factions: FactionRepository;
  worldRules: WorldRuleRepository;
  plotThreads: PlotThreadRepository;
  timelineEvents: TimelineEventRepository;
  timelineSpans: TimelineSpanRepository;
  structures: StructureRepository;
  contents: ContentRepository;
}

/**
 * Project service interface
 */
export interface ProjectService {
  /** Get all repositories */
  repos: ProjectRepositories;

  /** List all projects */
  listProjects(): ProjectSummary[];

  /** Create a new project */
  createProject(title: string, format: ProjectFormat, metadata?: Partial<ProjectMetadata>): Project;

  /** Load a complete project by ID */
  loadProject(id: string): Project | undefined;

  /** Save a complete project (all entities) */
  saveProject(project: Project): void;

  /** Delete a project and all its data */
  deleteProject(id: string): boolean;

  /** Update project settings */
  updateSettings(id: string, settings: ProjectSettings): boolean;

  /** Update project metadata */
  updateMetadata(id: string, metadata: ProjectMetadata): boolean;

  /** Recalculate and update project statistics */
  updateStats(id: string): ProjectStats | undefined;

  /** Get just the bible for a project */
  loadBible(projectId: string): Bible | undefined;

  /** Get just the structure tree for a project */
  loadStructure(projectId: string): Structure | undefined;
}

/**
 * Create project service
 */
export function createProjectService(db: Database.Database): ProjectService {
  // Create all repositories
  const repos: ProjectRepositories = {
    projects: createProjectRepository(db),
    characters: createCharacterRepository(db),
    locations: createLocationRepository(db),
    factions: createFactionRepository(db),
    worldRules: createWorldRuleRepository(db),
    plotThreads: createPlotThreadRepository(db),
    timelineEvents: createTimelineEventRepository(db),
    timelineSpans: createTimelineSpanRepository(db),
    structures: createStructureRepository(db),
    contents: createContentRepository(db),
  };

  /**
   * Load bible from repositories
   */
  function loadBibleFromRepos(projectId: string): Bible {
    const now = nowTimestamp();
    return {
      id: projectId,
      characters: repos.characters.findByProject(projectId),
      locations: repos.locations.findByProject(projectId),
      factions: repos.factions.findByProject(projectId),
      worldRules: repos.worldRules.findByProject(projectId),
      plotThreads: repos.plotThreads.findByProject(projectId),
      timelineEvents: repos.timelineEvents.findByProject(projectId),
      timelineSpans: repos.timelineSpans.findByProject(projectId),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Save bible to repositories
   */
  function saveBibleToRepos(projectId: string, bible: Bible): void {
    // Delete existing entities
    repos.characters.deleteByProject(projectId);
    repos.locations.deleteByProject(projectId);
    repos.factions.deleteByProject(projectId);
    repos.worldRules.deleteByProject(projectId);
    repos.plotThreads.deleteByProject(projectId);
    repos.timelineEvents.deleteByProject(projectId);
    repos.timelineSpans.deleteByProject(projectId);

    // Insert new entities
    for (const char of bible.characters) {
      repos.characters.create(projectId, {
        type: 'character',
        introducedAt: char.introducedAt,
        retiredAt: char.retiredAt,
        name: char.name,
        aliases: char.aliases,
        description: char.description,
        traits: char.traits,
        relationships: char.relationships,
        arc: char.arc,
        voiceSamples: char.voiceSamples,
        appearances: char.appearances,
        role: char.role,
        status: char.status,
      });
    }

    for (const loc of bible.locations) {
      repos.locations.create(projectId, {
        entityType: 'location',
        introducedAt: loc.introducedAt,
        retiredAt: loc.retiredAt,
        name: loc.name,
        aliases: loc.aliases,
        description: loc.description,
        type: loc.type,
        parentId: loc.parentId,
        relations: loc.relations,
        features: loc.features,
        atmosphere: loc.atmosphere,
        associatedCharacters: loc.associatedCharacters,
        status: loc.status,
      });
    }

    for (const faction of bible.factions) {
      repos.factions.create(projectId, {
        entityType: 'faction',
        introducedAt: faction.introducedAt,
        retiredAt: faction.retiredAt,
        name: faction.name,
        aliases: faction.aliases,
        description: faction.description,
        type: faction.type,
        ideology: faction.ideology,
        goals: faction.goals,
        ranks: faction.ranks,
        members: faction.members,
        relations: faction.relations,
        locations: faction.locations,
        status: faction.status,
        influence: faction.influence,
      });
    }

    for (const rule of bible.worldRules) {
      repos.worldRules.create(projectId, {
        type: 'world-rule',
        introducedAt: rule.introducedAt,
        retiredAt: rule.retiredAt,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        rule: rule.rule,
        rationale: rule.rationale,
        exceptions: rule.exceptions,
        consequences: rule.consequences,
        publicKnowledge: rule.publicKnowledge,
        relatedRules: rule.relatedRules,
        priority: rule.priority,
        established: rule.established,
      });
    }

    for (const thread of bible.plotThreads) {
      repos.plotThreads.create(projectId, {
        entityType: 'plot-thread',
        spineIntroducedAt: thread.spineIntroducedAt,
        spineRetiredAt: thread.spineRetiredAt,
        name: thread.name,
        description: thread.description,
        type: thread.type,
        status: thread.status,
        scope: thread.scope,
        priority: thread.priority,
        involvedCharacters: thread.involvedCharacters,
        relatedLocations: thread.relatedLocations,
        promises: thread.promises,
        touches: thread.touches,
        parentThreadId: thread.parentThreadId,
        childThreads: thread.childThreads,
        introducedAt: thread.introducedAt,
        resolvedAt: thread.resolvedAt,
      });
    }

    for (const event of bible.timelineEvents) {
      repos.timelineEvents.create(projectId, {
        entityType: 'timeline-event',
        spineIntroducedAt: event.spineIntroducedAt,
        spineRetiredAt: event.spineRetiredAt,
        name: event.name,
        description: event.description,
        position: event.position,
        duration: event.duration,
        type: event.type,
        significance: event.significance,
        involvedCharacters: event.involvedCharacters,
        locations: event.locations,
        relatedThreads: event.relatedThreads,
        causes: event.causes,
        effects: event.effects,
        revealed: event.revealed,
        contentRefs: event.contentRefs,
      });
    }

    for (const span of bible.timelineSpans) {
      repos.timelineSpans.create(projectId, {
        entityType: 'timeline-span',
        spineIntroducedAt: span.spineIntroducedAt,
        spineRetiredAt: span.spineRetiredAt,
        name: span.name,
        description: span.description,
        start: span.start,
        end: span.end,
        events: span.events,
      });
    }
  }

  /**
   * Save structure tree recursively
   */
  function saveStructureTree(projectId: string, structure: Structure, parentId?: string): void {
    repos.structures.create(projectId, {
      type: structure.type,
      title: structure.title,
      summary: structure.summary,
      beats: structure.beats,
      tensionTarget: structure.tensionTarget,
      chapterType: structure.chapterType,
      hook: structure.hook,
      order: structure.order,
      parentId,
      targetWordCount: structure.targetWordCount,
      notes: structure.notes,
    });

    for (const child of structure.children) {
      saveStructureTree(projectId, child, structure.id);
    }
  }

  return {
    repos,

    listProjects(): ProjectSummary[] {
      return repos.projects.listAll();
    },

    createProject(title: string, format: ProjectFormat, metadata?: Partial<ProjectMetadata>): Project {
      const now = nowTimestamp();
      const settings = createDefaultSettings(format);
      const fullMetadata: ProjectMetadata = {
        genres: [],
        ...metadata,
      };

      // Create project record - this generates the ID
      const projectSummary = repos.projects.create({
        title,
        format,
        settings,
        metadata: fullMetadata,
      });
      const projectId = projectSummary.id;

      // Create empty root structure for this project
      const createdStructure = repos.structures.create(projectId, {
        type: 'book',
        title,
        summary: '',
        beats: [],
        order: 0,
      });

      // Build the full structure with empty children array
      const rootStructure = { ...createdStructure, children: [] };

      const bible = createEmptyBible(projectId);

      return {
        id: projectId,
        title,
        format,
        settings,
        metadata: fullMetadata,
        bible,
        structure: rootStructure,
        content: [],
        createdAt: now,
        updatedAt: now,
      };
    },

    loadProject(id: string): Project | undefined {
      const summary = repos.projects.findById(id);
      if (!summary) return undefined;

      const settings = repos.projects.getSettings(id);
      const metadata = repos.projects.getMetadata(id);
      const stats = repos.projects.getStats(id);

      if (!settings || !metadata) return undefined;

      const bible = loadBibleFromRepos(id);
      const structure = repos.structures.loadFullTree(id);
      const content = repos.contents.findByProject(id);

      if (!structure) return undefined;

      return {
        id: summary.id,
        title: summary.title,
        format: summary.format,
        settings,
        metadata,
        bible,
        structure,
        content,
        stats,
        createdAt: summary.lastModified, // Approximate
        updatedAt: summary.lastModified,
      };
    },

    saveProject(project: Project): void {
      const saveTx = db.transaction(() => {
        // Update or create project record
        const existing = repos.projects.findById(project.id);
        if (existing) {
          repos.projects.updateSettings(project.id, project.settings);
          repos.projects.updateMetadata(project.id, project.metadata);
          if (project.stats) {
            repos.projects.updateStats(project.id, project.stats);
          }
        } else {
          repos.projects.create({
            title: project.title,
            format: project.format,
            settings: project.settings,
            metadata: project.metadata,
          });
        }

        // Save bible
        saveBibleToRepos(project.id, project.bible);

        // Save structure (delete existing first)
        repos.structures.deleteByProject(project.id);
        saveStructureTree(project.id, project.structure);

        // Save content (delete existing first)
        repos.contents.deleteByProject(project.id);
        for (const c of project.content) {
          repos.contents.create(project.id, {
            structureId: c.structureId,
            text: c.text,
            status: c.status,
            analysis: c.analysis,
            reviews: c.reviews,
            generationHistory: c.generationHistory,
            locked: c.locked,
            lockReason: c.lockReason,
            chapterNumber: c.chapterNumber,
            publishedAt: c.publishedAt,
            initialText: c.text,
            source: 'imported',
          });
        }

        repos.projects.touch(project.id);
      });

      saveTx();
    },

    deleteProject(id: string): boolean {
      // Cascade delete handles most cleanup via foreign keys
      return repos.projects.delete(id);
    },

    updateSettings(id: string, settings: ProjectSettings): boolean {
      const result = repos.projects.updateSettings(id, settings);
      if (result) repos.projects.touch(id);
      return result;
    },

    updateMetadata(id: string, metadata: ProjectMetadata): boolean {
      const result = repos.projects.updateMetadata(id, metadata);
      if (result) repos.projects.touch(id);
      return result;
    },

    updateStats(id: string): ProjectStats | undefined {
      const content = repos.contents.findByProject(id);
      const bible = loadBibleFromRepos(id);

      const chaptersByStatus = {
        draft: 0,
        review: 0,
        approved: 0,
        published: 0,
      };

      let totalWordCount = 0;
      let unresolvedIssues = 0;

      for (const c of content) {
        chaptersByStatus[c.status]++;
        const version = c.versions[c.currentVersion - 1];
        if (version) {
          totalWordCount += version.wordCount;
        }
        if (c.analysis) {
          unresolvedIssues += c.analysis.continuityIssues.filter((i) => !i.reviewed && !i.falsePositive).length;
        }
      }

      const stats: ProjectStats = {
        totalWordCount,
        totalChapters: content.length,
        chaptersByStatus,
        bibleStats: {
          characters: bible.characters.length,
          locations: bible.locations.length,
          factions: bible.factions.length,
          worldRules: bible.worldRules.length,
          plotThreads: bible.plotThreads.length,
          timelineEvents: bible.timelineEvents.length,
        },
        unresolvedIssues,
        calculatedAt: nowTimestamp(),
      };

      repos.projects.updateStats(id, stats);
      return stats;
    },

    loadBible(projectId: string): Bible | undefined {
      const project = repos.projects.findById(projectId);
      if (!project) return undefined;
      return loadBibleFromRepos(projectId);
    },

    loadStructure(projectId: string): Structure | undefined {
      const project = repos.projects.findById(projectId);
      if (!project) return undefined;
      return repos.structures.loadFullTree(projectId);
    },
  };
}
