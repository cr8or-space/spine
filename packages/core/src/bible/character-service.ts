/**
 * Character service for bible management
 *
 * Provides high-level CRUD operations for characters with
 * relationship management and search capabilities.
 */

import type {
  AppearanceRef,
  Character,
  CharacterArc,
  CharacterSummary,
  Relationship,
  Trait,
} from '@repo/types';

import type {
  CharacterRepository,
  CreateCharacterData,
  UpdateCharacterData,
} from '../storage/repositories';

/**
 * Character service interface
 */
export interface CharacterService {
  /** Get a character by ID */
  get(id: string): Character | undefined;

  /** Get all characters */
  getAll(): Character[];

  /** Get characters by role */
  getByRole(role: Character['role']): Character[];

  /** Get characters by status */
  getByStatus(status: Character['status']): Character[];

  /** Search characters by name, alias, or description */
  search(query: string): Character[];

  /** Find character by exact name */
  findByName(name: string): Character | undefined;

  /** Create a new character */
  create(data: CreateCharacterData): Character;

  /** Update a character */
  update(id: string, data: UpdateCharacterData): Character | undefined;

  /** Delete a character */
  delete(id: string): boolean;

  /** Add a trait to a character */
  addTrait(id: string, trait: Trait): Character | undefined;

  /** Remove a trait from a character */
  removeTrait(id: string, traitName: string): Character | undefined;

  /** Add a relationship */
  addRelationship(id: string, relationship: Relationship): Character | undefined;

  /** Remove a relationship */
  removeRelationship(id: string, targetId: string): Character | undefined;

  /** Get all relationships for a character */
  getRelationships(id: string): Relationship[];

  /** Get characters related to this character */
  getRelatedCharacters(id: string): Array<{ character: Character; relationship: Relationship }>;

  /** Update character arc */
  updateArc(id: string, arc: CharacterArc | undefined): Character | undefined;

  /** Add an appearance reference */
  addAppearance(id: string, appearance: AppearanceRef): Character | undefined;

  /** Add a voice sample */
  addVoiceSample(id: string, sample: string): Character | undefined;

  /** Remove a voice sample */
  removeVoiceSample(id: string, sampleIndex: number): Character | undefined;

  /** Get character summary for context assembly */
  getSummary(id: string): CharacterSummary | undefined;

  /** Get all character summaries */
  getAllSummaries(): CharacterSummary[];
}

/**
 * Create character service
 */
export function createCharacterService(
  projectId: string,
  repository: CharacterRepository
): CharacterService {
  function toSummary(char: Character): CharacterSummary {
    // Create a brief description (first sentence or truncated)
    const brief =
      char.description.split('.')[0]?.trim() ||
      char.description.substring(0, 100) + (char.description.length > 100 ? '...' : '');

    return {
      id: char.id,
      name: char.name,
      aliases: char.aliases,
      role: char.role,
      status: char.status,
      brief,
    };
  }

  return {
    get(id: string): Character | undefined {
      return repository.findById(projectId, id);
    },

    getAll(): Character[] {
      return repository.findByProject(projectId);
    },

    getByRole(role: Character['role']): Character[] {
      return repository.findByRole(projectId, role);
    },

    getByStatus(status: Character['status']): Character[] {
      return repository.findByStatus(projectId, status);
    },

    search(query: string): Character[] {
      return repository.search(projectId, query);
    },

    findByName(name: string): Character | undefined {
      return repository.findByName(projectId, name);
    },

    create(data: CreateCharacterData): Character {
      return repository.create(projectId, data);
    },

    update(id: string, data: UpdateCharacterData): Character | undefined {
      return repository.update(projectId, id, data);
    },

    delete(id: string): boolean {
      return repository.delete(projectId, id);
    },

    addTrait(id: string, trait: Trait): Character | undefined {
      const char = this.get(id);
      if (!char) return undefined;

      // Replace existing trait with same name or add new one
      const traits = [...char.traits.filter((t) => t.name !== trait.name), trait];
      return this.update(id, { traits });
    },

    removeTrait(id: string, traitName: string): Character | undefined {
      const char = this.get(id);
      if (!char) return undefined;

      const traits = char.traits.filter((t) => t.name !== traitName);
      return this.update(id, { traits });
    },

    addRelationship(id: string, relationship: Relationship): Character | undefined {
      return repository.addRelationship(projectId, id, relationship);
    },

    removeRelationship(id: string, targetId: string): Character | undefined {
      return repository.removeRelationship(projectId, id, targetId);
    },

    getRelationships(id: string): Relationship[] {
      const char = this.get(id);
      return char?.relationships ?? [];
    },

    getRelatedCharacters(id: string): Array<{ character: Character; relationship: Relationship }> {
      const relationships = this.getRelationships(id);
      const result: Array<{ character: Character; relationship: Relationship }> = [];

      for (const rel of relationships) {
        const character = this.get(rel.targetId);
        if (character) {
          result.push({ character, relationship: rel });
        }
      }

      return result;
    },

    updateArc(id: string, arc: CharacterArc | undefined): Character | undefined {
      return repository.updateArc(projectId, id, arc);
    },

    addAppearance(id: string, appearance: AppearanceRef): Character | undefined {
      return repository.addAppearance(projectId, id, appearance);
    },

    addVoiceSample(id: string, sample: string): Character | undefined {
      const char = this.get(id);
      if (!char) return undefined;

      const voiceSamples = [...char.voiceSamples, sample];
      return this.update(id, { voiceSamples });
    },

    removeVoiceSample(id: string, sampleIndex: number): Character | undefined {
      const char = this.get(id);
      if (!char) return undefined;

      const voiceSamples = char.voiceSamples.filter((_, i) => i !== sampleIndex);
      return this.update(id, { voiceSamples });
    },

    getSummary(id: string): CharacterSummary | undefined {
      const char = this.get(id);
      return char ? toSummary(char) : undefined;
    },

    getAllSummaries(): CharacterSummary[] {
      return this.getAll().map(toSummary);
    },
  };
}
