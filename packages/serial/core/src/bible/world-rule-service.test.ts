/**
 * Tests for world rule service
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { createTestDatabase, type DatabaseConnection } from '../storage/database';
import { createProjectService } from '../storage/project-service';
import {
  createWorldRuleRepository,
  type CreateWorldRuleData,
} from '../storage/repositories';
import { createWorldRuleService, type WorldRuleService } from './world-rule-service';

describe('WorldRuleService', () => {
  let db: DatabaseConnection;
  let service: WorldRuleService;
  let projectId: string;

  beforeEach(() => {
    db = createTestDatabase();
    const projectService = createProjectService(db.db, db.drizzle);
    const project = projectService.createProject('Test Project', 'web-serial');
    projectId = project.id;

    const repository = createWorldRuleRepository(db.db, db.drizzle);
    service = createWorldRuleService(projectId, repository);
  });

  afterEach(() => {
    db.close();
  });

  const createTestRule = (overrides: Partial<CreateWorldRuleData> = {}): CreateWorldRuleData => ({
    name: 'Test Rule',
    description: 'A test world rule.',
    category: 'physics',
    rule: 'Test rule statement.',
    exceptions: [],
    publicKnowledge: false,
    relatedRules: [],
    priority: 50,
    established: false,
    ...overrides,
  });

  describe('CRUD operations', () => {
    it('should create a world rule', () => {
      const rule = service.create(createTestRule({
        name: 'Gravity',
        category: 'physics',
        rule: 'Objects fall downward.',
      }));

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Gravity');
      expect(rule.category).toBe('physics');
    });

    it('should retrieve a world rule by ID', () => {
      const created = service.create(createTestRule({ name: 'Magic Rule' }));
      const retrieved = service.get(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Magic Rule');
    });

    it('should return undefined for non-existent rule', () => {
      const result = service.get('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should update a world rule', () => {
      const created = service.create(createTestRule({ name: 'Old Rule' }));
      const updated = service.update(created.id, { name: 'New Rule', priority: 80 });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Rule');
      expect(updated?.priority).toBe(80);
    });

    it('should delete a world rule', () => {
      const created = service.create(createTestRule({ name: 'ToDelete' }));
      const deleted = service.delete(created.id);

      expect(deleted).toBe(true);
      expect(service.get(created.id)).toBeUndefined();
    });

    it('should get all rules', () => {
      service.create(createTestRule({ name: 'Rule1' }));
      service.create(createTestRule({ name: 'Rule2' }));
      service.create(createTestRule({ name: 'Rule3' }));

      const all = service.getAll();
      expect(all.length).toBe(3);
    });
  });

  describe('filtering by category', () => {
    beforeEach(() => {
      service.create(createTestRule({ name: 'Magic System', category: 'magic' }));
      service.create(createTestRule({ name: 'Tech Limits', category: 'technology' }));
      service.create(createTestRule({ name: 'Social Norms', category: 'social' }));
      service.create(createTestRule({ name: 'Physics', category: 'physics' }));
      service.create(createTestRule({ name: 'Economy', category: 'economic' }));
    });

    it('should get magic rules', () => {
      const magic = service.getByCategory('magic');
      expect(magic.length).toBe(1);
      expect(magic[0].name).toBe('Magic System');
    });

    it('should get technology rules', () => {
      const tech = service.getByCategory('technology');
      expect(tech.length).toBe(1);
      expect(tech[0].name).toBe('Tech Limits');
    });

    it('should get social rules', () => {
      const social = service.getByCategory('social');
      expect(social.length).toBe(1);
      expect(social[0].name).toBe('Social Norms');
    });

    it('should get physics rules', () => {
      const physics = service.getByCategory('physics');
      expect(physics.length).toBe(1);
      expect(physics[0].name).toBe('Physics');
    });

    it('should get economic rules', () => {
      const economic = service.getByCategory('economic');
      expect(economic.length).toBe(1);
      expect(economic[0].name).toBe('Economy');
    });
  });

  describe('established and public knowledge filters', () => {
    beforeEach(() => {
      service.create(createTestRule({
        name: 'Established Public',
        established: true,
        publicKnowledge: true,
      }));
      service.create(createTestRule({
        name: 'Established Private',
        established: true,
        publicKnowledge: false,
      }));
      service.create(createTestRule({
        name: 'New Public',
        established: false,
        publicKnowledge: true,
      }));
      service.create(createTestRule({
        name: 'New Private',
        established: false,
        publicKnowledge: false,
      }));
    });

    it('should get established rules', () => {
      const established = service.getEstablished();
      expect(established.length).toBe(2);
      expect(established.every(r => r.established)).toBe(true);
    });

    it('should get public knowledge rules', () => {
      const publicRules = service.getPublicKnowledge();
      expect(publicRules.length).toBe(2);
      expect(publicRules.every(r => r.publicKnowledge)).toBe(true);
    });
  });

  describe('search and find', () => {
    beforeEach(() => {
      service.create(createTestRule({
        name: 'Law of Magic',
        description: 'How magic works in this world.',
        rule: 'Magic requires verbal components.',
      }));
      service.create(createTestRule({
        name: 'Technology Limits',
        description: 'Technology constraints.',
        rule: 'No gunpowder exists.',
      }));
    });

    it('should find by exact name', () => {
      const result = service.findByName('Law of Magic');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Law of Magic');
    });

    it('should search by name', () => {
      const results = service.search('Magic');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Law of Magic');
    });

    it('should search by description', () => {
      const results = service.search('constraints');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Technology Limits');
    });

    it('should search by rule statement', () => {
      const results = service.search('gunpowder');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Technology Limits');
    });
  });

  describe('exception management', () => {
    it('should add an exception', () => {
      const rule = service.create(createTestRule({ name: 'Magic Rule' }));
      const updated = service.addException(rule.id, {
        condition: 'During full moon',
        effect: 'Magic is amplified',
        reason: 'Lunar influence',
      });

      expect(updated?.exceptions.length).toBe(1);
      expect(updated?.exceptions[0].condition).toBe('During full moon');
    });

    it('should add multiple exceptions', () => {
      const rule = service.create(createTestRule({ name: 'Magic Rule' }));
      service.addException(rule.id, {
        condition: 'Exception 1',
        effect: 'Effect 1',
      });
      const updated = service.addException(rule.id, {
        condition: 'Exception 2',
        effect: 'Effect 2',
      });

      expect(updated?.exceptions.length).toBe(2);
    });

    it('should remove an exception', () => {
      const rule = service.create(createTestRule({
        name: 'Magic Rule',
        exceptions: [
          { condition: 'Exc 1', effect: 'Eff 1' },
          { condition: 'Exc 2', effect: 'Eff 2' },
          { condition: 'Exc 3', effect: 'Eff 3' },
        ],
      }));
      const updated = service.removeException(rule.id, 1);

      expect(updated?.exceptions.length).toBe(2);
      expect(updated?.exceptions[0].condition).toBe('Exc 1');
      expect(updated?.exceptions[1].condition).toBe('Exc 3');
    });

    it('should return undefined when adding exception to non-existent rule', () => {
      const result = service.addException('non-existent', {
        condition: 'Test',
        effect: 'Test',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('related rules management', () => {
    it('should add a related rule', () => {
      const rule1 = service.create(createTestRule({ name: 'Rule 1' }));
      const rule2 = service.create(createTestRule({ name: 'Rule 2' }));

      const updated = service.addRelatedRule(rule1.id, rule2.id);

      expect(updated?.relatedRules).toContain(rule2.id);
    });

    it('should not add self-reference', () => {
      const rule = service.create(createTestRule({ name: 'Rule 1' }));
      const updated = service.addRelatedRule(rule.id, rule.id);

      expect(updated?.relatedRules).not.toContain(rule.id);
    });

    it('should not duplicate related rules', () => {
      const rule1 = service.create(createTestRule({ name: 'Rule 1' }));
      const rule2 = service.create(createTestRule({ name: 'Rule 2' }));

      service.addRelatedRule(rule1.id, rule2.id);
      const updated = service.addRelatedRule(rule1.id, rule2.id);

      expect(updated?.relatedRules.filter(r => r === rule2.id).length).toBe(1);
    });

    it('should remove a related rule', () => {
      const rule1 = service.create(createTestRule({ name: 'Rule 1' }));
      const rule2 = service.create(createTestRule({ name: 'Rule 2' }));

      service.addRelatedRule(rule1.id, rule2.id);
      const updated = service.removeRelatedRule(rule1.id, rule2.id);

      expect(updated?.relatedRules).not.toContain(rule2.id);
    });

    it('should get related rules', () => {
      const rule1 = service.create(createTestRule({ name: 'Rule 1' }));
      const rule2 = service.create(createTestRule({ name: 'Rule 2' }));
      const rule3 = service.create(createTestRule({ name: 'Rule 3' }));

      service.addRelatedRule(rule1.id, rule2.id);
      service.addRelatedRule(rule1.id, rule3.id);

      const related = service.getRelatedRules(rule1.id);
      expect(related.length).toBe(2);
    });

    it('should get referencing rules', () => {
      const rule1 = service.create(createTestRule({ name: 'Rule 1' }));
      const rule2 = service.create(createTestRule({ name: 'Rule 2' }));
      const rule3 = service.create(createTestRule({ name: 'Rule 3' }));

      service.addRelatedRule(rule2.id, rule1.id);
      service.addRelatedRule(rule3.id, rule1.id);

      const referencing = service.getReferencingRules(rule1.id);
      expect(referencing.length).toBe(2);
    });

    it('should clean up references when deleting a rule', () => {
      const rule1 = service.create(createTestRule({ name: 'Rule 1' }));
      const rule2 = service.create(createTestRule({ name: 'Rule 2' }));

      service.addRelatedRule(rule2.id, rule1.id);
      service.delete(rule1.id);

      const rule2Updated = service.get(rule2.id);
      expect(rule2Updated?.relatedRules).not.toContain(rule1.id);
    });
  });

  describe('established and priority management', () => {
    it('should mark rule as established', () => {
      const rule = service.create(createTestRule({ name: 'Rule', established: false }));
      const updated = service.markEstablished(rule.id);

      expect(updated?.established).toBe(true);
    });

    it('should set priority', () => {
      const rule = service.create(createTestRule({ name: 'Rule', priority: 50 }));
      const updated = service.setPriority(rule.id, 75);

      expect(updated?.priority).toBe(75);
    });

    it('should clamp priority to 0-100', () => {
      const rule = service.create(createTestRule({ name: 'Rule' }));

      const tooLow = service.setPriority(rule.id, -10);
      expect(tooLow?.priority).toBe(0);

      const tooHigh = service.setPriority(rule.id, 150);
      expect(tooHigh?.priority).toBe(100);
    });

    it('should get rules sorted by priority', () => {
      service.create(createTestRule({ name: 'Low', priority: 20 }));
      service.create(createTestRule({ name: 'High', priority: 80 }));
      service.create(createTestRule({ name: 'Medium', priority: 50 }));

      const sorted = service.getByPriority();
      expect(sorted[0].name).toBe('High');
      expect(sorted[1].name).toBe('Medium');
      expect(sorted[2].name).toBe('Low');
    });
  });

  describe('conflict detection', () => {
    it('should find potential conflicts in same category', () => {
      const rule1 = service.create(createTestRule({
        name: 'Magic Rule 1',
        category: 'magic',
      }));
      service.create(createTestRule({
        name: 'Magic Rule 2',
        category: 'magic',
      }));
      service.create(createTestRule({
        name: 'Tech Rule',
        category: 'technology',
      }));

      const conflicts = service.findPotentialConflicts(rule1.id);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].name).toBe('Magic Rule 2');
    });

    it('should exclude related rules from conflicts', () => {
      const rule1 = service.create(createTestRule({
        name: 'Magic Rule 1',
        category: 'magic',
      }));
      const rule2 = service.create(createTestRule({
        name: 'Magic Rule 2',
        category: 'magic',
      }));

      service.addRelatedRule(rule1.id, rule2.id);
      const conflicts = service.findPotentialConflicts(rule1.id);

      expect(conflicts.length).toBe(0);
    });

    it('should return empty array for non-existent rule', () => {
      const conflicts = service.findPotentialConflicts('non-existent');
      expect(conflicts).toEqual([]);
    });
  });

  describe('summaries', () => {
    it('should get a rule summary', () => {
      const rule = service.create(createTestRule({
        name: 'Magic Law',
        category: 'magic',
        rule: 'Magic requires spoken words.',
        priority: 80,
      }));

      const summary = service.getSummary(rule.id);

      expect(summary).toBeDefined();
      expect(summary?.id).toBe(rule.id);
      expect(summary?.name).toBe('Magic Law');
      expect(summary?.category).toBe('magic');
      expect(summary?.rule).toBe('Magic requires spoken words.');
      expect(summary?.priority).toBe(80);
    });

    it('should return undefined for non-existent rule summary', () => {
      const summary = service.getSummary('non-existent');
      expect(summary).toBeUndefined();
    });

    it('should get all summaries', () => {
      service.create(createTestRule({ name: 'Rule1' }));
      service.create(createTestRule({ name: 'Rule2' }));
      service.create(createTestRule({ name: 'Rule3' }));

      const summaries = service.getAllSummaries();
      expect(summaries.length).toBe(3);
    });
  });
});
