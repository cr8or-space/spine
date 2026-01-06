/**
 * World rule service for bible management
 *
 * Provides high-level CRUD operations for world rules with
 * exception management and conflict detection.
 */

import type { RuleException, WorldRule, WorldRuleSummary } from '@repo/serial-types';

import type {
  CreateWorldRuleData,
  UpdateWorldRuleData,
  WorldRuleRepository,
} from '../storage/repositories';

/**
 * World rule service interface
 */
export interface WorldRuleService {
  /** Get a world rule by ID */
  get(id: string): WorldRule | undefined;

  /** Get all world rules */
  getAll(): WorldRule[];

  /** Get rules by category */
  getByCategory(category: WorldRule['category']): WorldRule[];

  /** Get established rules only */
  getEstablished(): WorldRule[];

  /** Get public knowledge rules */
  getPublicKnowledge(): WorldRule[];

  /** Search rules by name or description */
  search(query: string): WorldRule[];

  /** Find rule by exact name */
  findByName(name: string): WorldRule | undefined;

  /** Create a new world rule */
  create(data: CreateWorldRuleData): WorldRule;

  /** Update a world rule */
  update(id: string, data: UpdateWorldRuleData): WorldRule | undefined;

  /** Delete a world rule */
  delete(id: string): boolean;

  /** Add an exception to a rule */
  addException(id: string, exception: RuleException): WorldRule | undefined;

  /** Remove an exception */
  removeException(id: string, exceptionIndex: number): WorldRule | undefined;

  /** Add a related rule reference */
  addRelatedRule(id: string, relatedRuleId: string): WorldRule | undefined;

  /** Remove a related rule reference */
  removeRelatedRule(id: string, relatedRuleId: string): WorldRule | undefined;

  /** Get related rules */
  getRelatedRules(id: string): WorldRule[];

  /** Get rules that reference this rule */
  getReferencingRules(id: string): WorldRule[];

  /** Mark rule as established */
  markEstablished(id: string): WorldRule | undefined;

  /** Update rule priority */
  setPriority(id: string, priority: number): WorldRule | undefined;

  /** Get rules sorted by priority (highest first) */
  getByPriority(): WorldRule[];

  /** Find potential conflicts (rules with same category and different effects) */
  findPotentialConflicts(id: string): WorldRule[];

  /** Get rule summary for context assembly */
  getSummary(id: string): WorldRuleSummary | undefined;

  /** Get all rule summaries */
  getAllSummaries(): WorldRuleSummary[];
}

/**
 * Create world rule service
 */
export function createWorldRuleService(
  projectId: string,
  repository: WorldRuleRepository
): WorldRuleService {
  function toSummary(rule: WorldRule): WorldRuleSummary {
    return {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      rule: rule.rule,
      priority: rule.priority,
    };
  }

  return {
    get(id: string): WorldRule | undefined {
      return repository.findById(projectId, id);
    },

    getAll(): WorldRule[] {
      return repository.findByProject(projectId);
    },

    getByCategory(category: WorldRule['category']): WorldRule[] {
      return repository.findByCategory(projectId, category);
    },

    getEstablished(): WorldRule[] {
      return repository.findEstablished(projectId);
    },

    getPublicKnowledge(): WorldRule[] {
      return this.getAll().filter((r) => r.publicKnowledge);
    },

    search(query: string): WorldRule[] {
      const lowerQuery = query.toLowerCase();
      return this.getAll().filter(
        (r) =>
          r.name.toLowerCase().includes(lowerQuery) ||
          r.description.toLowerCase().includes(lowerQuery) ||
          r.rule.toLowerCase().includes(lowerQuery)
      );
    },

    findByName(name: string): WorldRule | undefined {
      return repository.findByName(projectId, name);
    },

    create(data: CreateWorldRuleData): WorldRule {
      return repository.create(projectId, data);
    },

    update(id: string, data: UpdateWorldRuleData): WorldRule | undefined {
      return repository.update(projectId, id, data);
    },

    delete(id: string): boolean {
      // Also remove references from other rules
      const rule = this.get(id);
      if (rule) {
        const referencingRules = this.getReferencingRules(id);
        for (const refRule of referencingRules) {
          this.removeRelatedRule(refRule.id, id);
        }
      }
      return repository.delete(projectId, id);
    },

    addException(id: string, exception: RuleException): WorldRule | undefined {
      const rule = this.get(id);
      if (!rule) return undefined;

      const exceptions = [...rule.exceptions, exception];
      return this.update(id, { exceptions });
    },

    removeException(id: string, exceptionIndex: number): WorldRule | undefined {
      const rule = this.get(id);
      if (!rule) return undefined;

      const exceptions = rule.exceptions.filter((_, i) => i !== exceptionIndex);
      return this.update(id, { exceptions });
    },

    addRelatedRule(id: string, relatedRuleId: string): WorldRule | undefined {
      const rule = this.get(id);
      if (!rule) return undefined;

      // Don't add self-reference
      if (relatedRuleId === id) return rule;

      if (rule.relatedRules.includes(relatedRuleId)) {
        return rule;
      }

      const relatedRules = [...rule.relatedRules, relatedRuleId];
      return this.update(id, { relatedRules });
    },

    removeRelatedRule(id: string, relatedRuleId: string): WorldRule | undefined {
      const rule = this.get(id);
      if (!rule) return undefined;

      const relatedRules = rule.relatedRules.filter((r) => r !== relatedRuleId);
      return this.update(id, { relatedRules });
    },

    getRelatedRules(id: string): WorldRule[] {
      const rule = this.get(id);
      if (!rule) return [];

      return rule.relatedRules
        .map((relId) => this.get(relId))
        .filter((r): r is WorldRule => r !== undefined);
    },

    getReferencingRules(id: string): WorldRule[] {
      return this.getAll().filter((r) => r.relatedRules.includes(id));
    },

    markEstablished(id: string): WorldRule | undefined {
      return this.update(id, { established: true });
    },

    setPriority(id: string, priority: number): WorldRule | undefined {
      // Clamp priority to valid range
      const clampedPriority = Math.max(0, Math.min(100, priority));
      return this.update(id, { priority: clampedPriority });
    },

    getByPriority(): WorldRule[] {
      return [...this.getAll()].sort((a, b) => b.priority - a.priority);
    },

    findPotentialConflicts(id: string): WorldRule[] {
      const rule = this.get(id);
      if (!rule) return [];

      // Find other rules in the same category that might conflict
      return this.getByCategory(rule.category).filter(
        (r) =>
          r.id !== id &&
          // Exclude already related rules
          !rule.relatedRules.includes(r.id)
      );
    },

    getSummary(id: string): WorldRuleSummary | undefined {
      const rule = this.get(id);
      return rule ? toSummary(rule) : undefined;
    },

    getAllSummaries(): WorldRuleSummary[] {
      return this.getAll().map(toSummary);
    },
  };
}
