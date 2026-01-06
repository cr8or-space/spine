/**
 * Faction service for bible management
 *
 * Provides high-level CRUD operations for factions with
 * membership management and inter-faction relationships.
 */

import type {
  Faction,
  FactionMember,
  FactionRank,
  FactionRelation,
  FactionSummary,
} from '@repo/serial-types';

import type {
  CreateFactionData,
  FactionRepository,
  UpdateFactionData,
} from '../storage/repositories';

/**
 * Faction service interface
 */
export interface FactionService {
  /** Get a faction by ID */
  get(id: string): Faction | undefined;

  /** Get all factions */
  getAll(): Faction[];

  /** Get factions by type */
  getByType(type: Faction['type']): Faction[];

  /** Get factions by status */
  getByStatus(status: Faction['status']): Faction[];

  /** Get factions by influence level */
  getByInfluence(influence: Faction['influence']): Faction[];

  /** Search factions by name or description */
  search(query: string): Faction[];

  /** Find faction by exact name */
  findByName(name: string): Faction | undefined;

  /** Create a new faction */
  create(data: CreateFactionData): Faction;

  /** Update a faction */
  update(id: string, data: UpdateFactionData): Faction | undefined;

  /** Delete a faction */
  delete(id: string): boolean;

  /** Add a rank to a faction */
  addRank(id: string, rank: FactionRank): Faction | undefined;

  /** Remove a rank */
  removeRank(id: string, rankName: string): Faction | undefined;

  /** Reorder ranks */
  reorderRanks(id: string, rankNames: string[]): Faction | undefined;

  /** Add a member to a faction */
  addMember(id: string, member: FactionMember): Faction | undefined;

  /** Update a member's details */
  updateMember(id: string, characterId: string, updates: Partial<FactionMember>): Faction | undefined;

  /** Remove a member */
  removeMember(id: string, characterId: string): Faction | undefined;

  /** Get all members of a faction */
  getMembers(id: string): FactionMember[];

  /** Get factions a character belongs to */
  getByCharacter(characterId: string): Faction[];

  /** Add a relation to another faction */
  addRelation(id: string, relation: FactionRelation): Faction | undefined;

  /** Remove a relation */
  removeRelation(id: string, targetId: string): Faction | undefined;

  /** Get related factions */
  getRelatedFactions(id: string): Array<{ faction: Faction; relation: FactionRelation }>;

  /** Add a goal */
  addGoal(id: string, goal: string): Faction | undefined;

  /** Remove a goal */
  removeGoal(id: string, goalIndex: number): Faction | undefined;

  /** Associate a location with the faction */
  addLocation(id: string, locationId: string): Faction | undefined;

  /** Remove location association */
  removeLocation(id: string, locationId: string): Faction | undefined;

  /** Get faction summary for context assembly */
  getSummary(id: string): FactionSummary | undefined;

  /** Get all faction summaries */
  getAllSummaries(): FactionSummary[];
}

/**
 * Create faction service
 */
export function createFactionService(
  projectId: string,
  repository: FactionRepository
): FactionService {
  function toSummary(faction: Faction): FactionSummary {
    const brief =
      faction.description.split('.')[0]?.trim() ||
      faction.description.substring(0, 100) + (faction.description.length > 100 ? '...' : '');

    return {
      id: faction.id,
      name: faction.name,
      type: faction.type,
      influence: faction.influence,
      brief,
    };
  }

  return {
    get(id: string): Faction | undefined {
      return repository.findById(projectId, id);
    },

    getAll(): Faction[] {
      return repository.findByProject(projectId);
    },

    getByType(type: Faction['type']): Faction[] {
      return repository.findByType(projectId, type);
    },

    getByStatus(status: Faction['status']): Faction[] {
      return this.getAll().filter((f) => f.status === status);
    },

    getByInfluence(influence: Faction['influence']): Faction[] {
      return repository.findByInfluence(projectId, influence);
    },

    search(query: string): Faction[] {
      const lowerQuery = query.toLowerCase();
      return this.getAll().filter(
        (f) =>
          f.name.toLowerCase().includes(lowerQuery) ||
          f.description.toLowerCase().includes(lowerQuery) ||
          f.aliases.some((a) => a.toLowerCase().includes(lowerQuery))
      );
    },

    findByName(name: string): Faction | undefined {
      return repository.findByName(projectId, name);
    },

    create(data: CreateFactionData): Faction {
      return repository.create(projectId, data);
    },

    update(id: string, data: UpdateFactionData): Faction | undefined {
      return repository.update(projectId, id, data);
    },

    delete(id: string): boolean {
      return repository.delete(projectId, id);
    },

    addRank(id: string, rank: FactionRank): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      // Replace existing rank with same name or add new one
      const ranks = [...faction.ranks.filter((r) => r.name !== rank.name), rank];
      // Sort by level
      ranks.sort((a, b) => b.level - a.level);
      return this.update(id, { ranks });
    },

    removeRank(id: string, rankName: string): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const ranks = faction.ranks.filter((r) => r.name !== rankName);
      return this.update(id, { ranks });
    },

    reorderRanks(id: string, rankNames: string[]): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const rankMap = new Map(faction.ranks.map((r) => [r.name, r]));
      const ranks: FactionRank[] = [];

      for (let i = 0; i < rankNames.length; i++) {
        const rank = rankMap.get(rankNames[i]);
        if (rank) {
          ranks.push({ ...rank, level: rankNames.length - i - 1 });
        }
      }

      return this.update(id, { ranks });
    },

    addMember(id: string, member: FactionMember): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const members = [
        ...faction.members.filter((m) => m.characterId !== member.characterId),
        member,
      ];
      return this.update(id, { members });
    },

    updateMember(
      id: string,
      characterId: string,
      updates: Partial<FactionMember>
    ): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const members = faction.members.map((m) =>
        m.characterId === characterId ? { ...m, ...updates } : m
      );
      return this.update(id, { members });
    },

    removeMember(id: string, characterId: string): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const members = faction.members.filter((m) => m.characterId !== characterId);
      return this.update(id, { members });
    },

    getMembers(id: string): FactionMember[] {
      const faction = this.get(id);
      return faction?.members ?? [];
    },

    getByCharacter(characterId: string): Faction[] {
      return this.getAll().filter((f) => f.members.some((m) => m.characterId === characterId));
    },

    addRelation(id: string, relation: FactionRelation): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const relations = [
        ...faction.relations.filter((r) => r.targetId !== relation.targetId),
        relation,
      ];
      return this.update(id, { relations });
    },

    removeRelation(id: string, targetId: string): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const relations = faction.relations.filter((r) => r.targetId !== targetId);
      return this.update(id, { relations });
    },

    getRelatedFactions(id: string): Array<{ faction: Faction; relation: FactionRelation }> {
      const faction = this.get(id);
      if (!faction) return [];

      const result: Array<{ faction: Faction; relation: FactionRelation }> = [];
      for (const rel of faction.relations) {
        const related = this.get(rel.targetId);
        if (related) {
          result.push({ faction: related, relation: rel });
        }
      }

      return result;
    },

    addGoal(id: string, goal: string): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      if (faction.goals.includes(goal)) {
        return faction;
      }

      const goals = [...faction.goals, goal];
      return this.update(id, { goals });
    },

    removeGoal(id: string, goalIndex: number): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const goals = faction.goals.filter((_, i) => i !== goalIndex);
      return this.update(id, { goals });
    },

    addLocation(id: string, locationId: string): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      if (faction.locations.includes(locationId)) {
        return faction;
      }

      const locations = [...faction.locations, locationId];
      return this.update(id, { locations });
    },

    removeLocation(id: string, locationId: string): Faction | undefined {
      const faction = this.get(id);
      if (!faction) return undefined;

      const locations = faction.locations.filter((l) => l !== locationId);
      return this.update(id, { locations });
    },

    getSummary(id: string): FactionSummary | undefined {
      const faction = this.get(id);
      return faction ? toSummary(faction) : undefined;
    },

    getAllSummaries(): FactionSummary[] {
      return this.getAll().map(toSummary);
    },
  };
}
