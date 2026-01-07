/**
 * Utility functions for adding/removing items from array fields in entities.
 *
 * These helpers extract the common "add-relation" pattern used across repositories:
 * 1. Find existing entity
 * 2. Modify array field (append, replace, or idempotent add)
 * 3. Update entity with new array
 *
 * Three main patterns:
 * - `appendToArray`: Simple append (e.g., addAppearance, addException)
 * - `upsertInArray`: Replace existing if key matches, else append (e.g., addRelationship)
 * - `addIfNotPresent`: Skip if already exists (e.g., associateCharacter, addEffect)
 */

/**
 * Helper type to extract array element type
 */
type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Configuration for relation update operations
 */
export interface RelationUpdateConfig<T, TField extends keyof T> {
  /** The entity to modify */
  entity: T;
  /** The field name containing the array */
  field: TField;
  /** The item to add */
  item: ArrayElement<T[TField]>;
  /** Callback to perform the update */
  update: (data: Partial<T>) => T | undefined;
}

/**
 * Configuration for relation update with key matching
 */
export interface RelationUpsertConfig<T, TField extends keyof T> extends RelationUpdateConfig<T, TField> {
  /** Function to extract the key from an item for matching */
  getKey: (item: ArrayElement<T[TField]>) => string;
}

/**
 * Configuration for primitive array operations (string IDs)
 */
export interface PrimitiveArrayConfig<T, TField extends keyof T> {
  /** The entity to modify */
  entity: T;
  /** The field name containing the array */
  field: TField;
  /** The item to add */
  item: string;
  /** Callback to perform the update */
  update: (data: Partial<T>) => T | undefined;
}

/**
 * Configuration for remove from array with key matching
 */
export interface RemoveFromArrayConfig<T, TField extends keyof T> {
  /** The entity to modify */
  entity: T;
  /** The field name containing the array */
  field: TField;
  /** Function to extract the key from an item for matching */
  getKey: (item: ArrayElement<T[TField]>) => string;
  /** The key value to remove */
  keyToRemove: string;
  /** Callback to perform the update */
  update: (data: Partial<T>) => T | undefined;
}

/**
 * Simple append to array field.
 *
 * Use when:
 * - Duplicates are allowed or prevented elsewhere
 * - No key-based deduplication needed
 *
 * @example
 * ```ts
 * return appendToArray({
 *   entity: existing,
 *   field: 'appearances',
 *   item: appearance,
 *   update: (data) => this.update(projectId, id, data),
 * });
 * ```
 */
export function appendToArray<T, TField extends keyof T>(
  config: RelationUpdateConfig<T, TField>
): T | undefined {
  const { entity, field, item, update } = config;
  const currentArray = entity[field] as ArrayElement<T[TField]>[];
  const newArray = [...currentArray, item];
  return update({ [field]: newArray } as Partial<T>);
}

/**
 * Upsert into array field: replace existing item if key matches, else append.
 *
 * Use when:
 * - Items have a unique key (e.g., targetId, characterId)
 * - Updating an existing item should replace it
 *
 * @example
 * ```ts
 * return upsertInArray({
 *   entity: existing,
 *   field: 'relationships',
 *   item: relationship,
 *   getKey: (r) => r.targetId,
 *   update: (data) => this.update(projectId, id, data),
 * });
 * ```
 */
export function upsertInArray<T, TField extends keyof T>(
  config: RelationUpsertConfig<T, TField>
): T | undefined {
  const { entity, field, item, getKey, update } = config;
  const currentArray = entity[field] as ArrayElement<T[TField]>[];
  const itemKey = getKey(item);
  const newArray = [...currentArray.filter((existing) => getKey(existing) !== itemKey), item];
  return update({ [field]: newArray } as Partial<T>);
}

/**
 * Add to array field only if not already present.
 *
 * Use when:
 * - Operation should be idempotent
 * - Item presence is determined by key match
 *
 * Returns existing entity unchanged if item already present.
 *
 * @example
 * ```ts
 * return addIfNotPresent({
 *   entity: existing,
 *   field: 'effects',
 *   item: effectId,
 *   update: (data) => this.update(projectId, id, data),
 * });
 * ```
 */
export function addIfNotPresent<T, TField extends keyof T>(
  config: PrimitiveArrayConfig<T, TField>
): T | undefined {
  const { entity, field, item, update } = config;
  const currentArray = entity[field] as string[];

  if (currentArray.includes(item)) {
    return entity;
  }

  const newArray = [...currentArray, item];
  return update({ [field]: newArray } as Partial<T>);
}

/**
 * Add object to array field only if not already present (by key).
 *
 * Use when:
 * - Operation should be idempotent
 * - Items are objects with a unique key
 *
 * Returns existing entity unchanged if item with same key already present.
 *
 * @example
 * ```ts
 * return addObjectIfNotPresent({
 *   entity: existing,
 *   field: 'causes',
 *   item: cause,
 *   getKey: (c) => c.causeEventId,
 *   update: (data) => this.update(projectId, id, data),
 * });
 * ```
 */
export function addObjectIfNotPresent<T, TField extends keyof T>(
  config: RelationUpsertConfig<T, TField>
): T | undefined {
  const { entity, field, item, getKey, update } = config;
  const currentArray = entity[field] as ArrayElement<T[TField]>[];
  const itemKey = getKey(item);

  if (currentArray.some((existing) => getKey(existing) === itemKey)) {
    return entity;
  }

  const newArray = [...currentArray, item];
  return update({ [field]: newArray } as Partial<T>);
}

/**
 * Remove from array field by key match.
 *
 * @example
 * ```ts
 * return removeFromArray({
 *   entity: existing,
 *   field: 'relationships',
 *   getKey: (r) => r.targetId,
 *   keyToRemove: targetId,
 *   update: (data) => this.update(projectId, id, data),
 * });
 * ```
 */
export function removeFromArray<T, TField extends keyof T>(
  config: RemoveFromArrayConfig<T, TField>
): T | undefined {
  const { entity, field, getKey, keyToRemove, update } = config;
  const currentArray = entity[field] as ArrayElement<T[TField]>[];
  const newArray = currentArray.filter((existing) => getKey(existing) !== keyToRemove);
  return update({ [field]: newArray } as Partial<T>);
}

/**
 * Remove from primitive array field.
 *
 * @example
 * ```ts
 * return removePrimitive({
 *   entity: existing,
 *   field: 'effects',
 *   item: effectId,
 *   update: (data) => this.update(projectId, id, data),
 * });
 * ```
 */
export function removePrimitive<T, TField extends keyof T>(
  config: PrimitiveArrayConfig<T, TField>
): T | undefined {
  const { entity, field, item, update } = config;
  const currentArray = entity[field] as string[];
  const newArray = currentArray.filter((existing) => existing !== item);
  return update({ [field]: newArray } as Partial<T>);
}
