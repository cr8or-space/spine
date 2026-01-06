/**
 * Project service tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from './database';
import { createProjectService, type ProjectService } from './project-service';

describe('ProjectService', () => {
  let db: DatabaseConnection;
  let service: ProjectService;

  beforeEach(() => {
    db = createTestDatabase();
    service = createProjectService(db.db, db.drizzle);
  });

  afterEach(() => {
    db.close();
  });

  describe('createProject', () => {
    it('should create a new project with default settings', () => {
      const project = service.createProject('My Novel', 'web-serial');

      expect(project.id).toBeDefined();
      expect(project.title).toBe('My Novel');
      expect(project.format).toBe('web-serial');
      expect(project.settings).toBeDefined();
      expect(project.settings.serial).toBeDefined(); // Web serial specific settings
      expect(project.metadata.genres).toEqual([]);
      expect(project.bible.characters).toEqual([]);
      expect(project.structure.type).toBe('book');
      expect(project.content).toEqual([]);
    });

    it('should create project with custom metadata', () => {
      const project = service.createProject('My Novel', 'light-novel', {
        author: 'Test Author',
        genres: ['Fantasy', 'Adventure'],
        audience: 'young-adult',
      });

      expect(project.metadata.author).toBe('Test Author');
      expect(project.metadata.genres).toEqual(['Fantasy', 'Adventure']);
      expect(project.metadata.audience).toBe('young-adult');
    });

    it('should create different default settings for different formats', () => {
      const webSerial = service.createProject('Web Serial', 'web-serial');
      const short = service.createProject('Short Story', 'short');

      expect(webSerial.settings.serial).toBeDefined();
      expect(short.settings.serial).toBeUndefined();
    });
  });

  describe('listProjects', () => {
    it('should list all projects', () => {
      service.createProject('Project 1', 'web-serial');
      service.createProject('Project 2', 'light-novel');
      service.createProject('Project 3', 'short');

      const projects = service.listProjects();
      expect(projects).toHaveLength(3);
    });

    it('should return empty array when no projects exist', () => {
      const projects = service.listProjects();
      expect(projects).toEqual([]);
    });
  });

  describe('loadProject', () => {
    it('should load a complete project', () => {
      const created = service.createProject('Test Project', 'web-serial', {
        author: 'Author',
        genres: ['Fantasy'],
      });

      // Add some data to the project
      service.repos.characters.create(created.id, {
        name: 'Hero',
        aliases: [],
        description: 'The main character',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      service.repos.locations.create(created.id, {
        name: 'Castle',
        aliases: [],
        description: 'A grand castle',
        type: 'building',
        relations: [],
        features: [],
        associatedCharacters: [],
        status: 'accessible',
      });

      const loaded = service.loadProject(created.id);

      expect(loaded).toBeDefined();
      expect(loaded?.title).toBe('Test Project');
      expect(loaded?.metadata.author).toBe('Author');
      expect(loaded?.bible.characters).toHaveLength(1);
      expect(loaded?.bible.characters[0].name).toBe('Hero');
      expect(loaded?.bible.locations).toHaveLength(1);
      expect(loaded?.structure).toBeDefined();
    });

    it('should return undefined for non-existent project', () => {
      const loaded = service.loadProject('nonexistent');
      expect(loaded).toBeUndefined();
    });
  });

  describe('saveProject', () => {
    it('should save and reload a project', () => {
      const project = service.createProject('Test', 'web-serial');

      // Modify the project
      project.title = 'Updated Title';
      project.bible.characters.push({
        id: 'char1',
        name: 'New Character',
        aliases: [],
        description: 'Added after creation',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      service.saveProject(project);

      const loaded = service.loadProject(project.id);
      expect(loaded?.bible.characters).toHaveLength(1);
      expect(loaded?.bible.characters[0].name).toBe('New Character');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project and all its data', () => {
      const project = service.createProject('To Delete', 'web-serial');

      // Add some data
      service.repos.characters.create(project.id, {
        name: 'Character',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'minor',
        status: 'active',
      });

      const deleted = service.deleteProject(project.id);
      expect(deleted).toBe(true);

      const loaded = service.loadProject(project.id);
      expect(loaded).toBeUndefined();

      // Verify cascade deleted data
      const characters = service.repos.characters.findByProject(project.id);
      expect(characters).toHaveLength(0);
    });

    it('should return false for non-existent project', () => {
      const deleted = service.deleteProject('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should update project settings', () => {
      const project = service.createProject('Test', 'web-serial');

      const newSettings = {
        ...project.settings,
        defaultChapterWordCount: 5000,
        autoSaveInterval: 120,
      };

      const result = service.updateSettings(project.id, newSettings);
      expect(result).toBe(true);

      const loaded = service.loadProject(project.id);
      expect(loaded?.settings.defaultChapterWordCount).toBe(5000);
      expect(loaded?.settings.autoSaveInterval).toBe(120);
    });
  });

  describe('updateMetadata', () => {
    it('should update project metadata', () => {
      const project = service.createProject('Test', 'web-serial');

      const newMetadata = {
        ...project.metadata,
        author: 'New Author',
        genres: ['Sci-Fi', 'Thriller'],
      };

      const result = service.updateMetadata(project.id, newMetadata);
      expect(result).toBe(true);

      const loaded = service.loadProject(project.id);
      expect(loaded?.metadata.author).toBe('New Author');
      expect(loaded?.metadata.genres).toEqual(['Sci-Fi', 'Thriller']);
    });
  });

  describe('updateStats', () => {
    it('should calculate and update project statistics', () => {
      const project = service.createProject('Test', 'web-serial');

      // Add some characters
      service.repos.characters.create(project.id, {
        name: 'Char 1',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'protagonist',
        status: 'active',
      });

      service.repos.characters.create(project.id, {
        name: 'Char 2',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'antagonist',
        status: 'active',
      });

      // Add a location
      service.repos.locations.create(project.id, {
        name: 'Place',
        aliases: [],
        description: '',
        type: 'city',
        relations: [],
        features: [],
        associatedCharacters: [],
        status: 'accessible',
      });

      const stats = service.updateStats(project.id);

      expect(stats).toBeDefined();
      expect(stats?.bibleStats.characters).toBe(2);
      expect(stats?.bibleStats.locations).toBe(1);
      expect(stats?.totalChapters).toBe(0);
      expect(stats?.totalWordCount).toBe(0);
    });
  });

  describe('loadBible', () => {
    it('should load just the bible for a project', () => {
      const project = service.createProject('Test', 'web-serial');

      service.repos.characters.create(project.id, {
        name: 'Character',
        aliases: [],
        description: '',
        traits: [],
        relationships: [],
        voiceSamples: [],
        appearances: [],
        role: 'major',
        status: 'active',
      });

      const bible = service.loadBible(project.id);

      expect(bible).toBeDefined();
      expect(bible?.characters).toHaveLength(1);
    });

    it('should return undefined for non-existent project', () => {
      const bible = service.loadBible('nonexistent');
      expect(bible).toBeUndefined();
    });
  });

  describe('loadStructure', () => {
    it('should load the structure tree for a project', () => {
      const project = service.createProject('Test', 'web-serial');

      // Add a chapter to the structure
      service.repos.structures.create(project.id, {
        type: 'chapter',
        title: 'Chapter 1',
        summary: 'The beginning',
        beats: [],
        order: 0,
        parentId: project.structure.id,
      });

      const structure = service.loadStructure(project.id);

      expect(structure).toBeDefined();
      expect(structure?.type).toBe('book');
      expect(structure?.children).toHaveLength(1);
      expect(structure?.children[0].title).toBe('Chapter 1');
    });
  });
});
