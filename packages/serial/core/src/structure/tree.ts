/**
 * Structure tree operations for web serial hierarchy
 *
 * Provides functions for:
 * - Tree traversal (ancestors, descendants, linearization)
 * - Path computation (structure path, depth calculation)
 * - Tree validation (parent-child relationships, orphan detection)
 * - Tree queries (find by type, find by path pattern)
 */

import type { Structure, StructureType } from '@repo/serial-types';

/**
 * Valid parent-child relationships in the structure hierarchy.
 * Book → Arc → Chapter → Scene
 * Book can also contain chapters directly (skipping arc level)
 */
export const VALID_CHILD_TYPES: Record<StructureType, StructureType[]> = {
  book: ['arc', 'chapter'], // Books can contain arcs or chapters directly
  arc: ['chapter'],
  chapter: ['scene'],
  scene: [], // Scenes are leaf nodes
};

/**
 * Structure type hierarchy levels (root = 0)
 */
export const STRUCTURE_DEPTH: Record<StructureType, number> = {
  book: 0,
  arc: 1,
  chapter: 2,
  scene: 3,
};

/**
 * Path segment in a structure hierarchy
 */
export interface PathSegment {
  id: string;
  type: StructureType;
  title: string;
  order: number;
}

/**
 * Result of tree validation
 */
export interface TreeValidationResult {
  valid: boolean;
  issues: TreeValidationIssue[];
}

/**
 * Individual validation issue in a tree
 */
export interface TreeValidationIssue {
  structureId: string;
  issueType: 'invalid_parent_child' | 'orphan' | 'circular' | 'missing_parent' | 'invalid_root';
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Tree traversal options
 */
export interface TraversalOptions {
  /** Include the starting node in results */
  includeSelf?: boolean;
  /** Maximum depth to traverse (undefined = unlimited) */
  maxDepth?: number;
  /** Filter by structure type */
  filterType?: StructureType;
  /** Stop traversal when predicate returns true */
  stopWhen?: (node: Structure) => boolean;
}

/**
 * Check if a parent-child relationship is valid
 *
 * @param parentType - Type of the parent (null for root level)
 * @param childType - Type of the child
 * @returns true if the relationship is valid
 */
export function isValidParentChild(
  parentType: StructureType | null,
  childType: StructureType
): boolean {
  if (parentType === null) {
    // Root level - only books allowed
    return childType === 'book';
  }

  return VALID_CHILD_TYPES[parentType].includes(childType);
}

/**
 * Get valid child types for a structure type
 *
 * @param parentType - Type of the parent (null for root level)
 * @returns Array of valid child types
 */
export function getValidChildTypes(parentType: StructureType | null): StructureType[] {
  if (parentType === null) {
    return ['book'];
  }
  return VALID_CHILD_TYPES[parentType];
}

/**
 * Get the depth of a structure type in the hierarchy
 *
 * @param type - Structure type
 * @returns Depth level (book=0, arc=1, chapter=2, scene=3)
 */
export function getTypeDepth(type: StructureType): number {
  return STRUCTURE_DEPTH[type];
}

/**
 * Calculate the actual depth of a structure in the tree
 *
 * @param structure - Structure to measure
 * @param structures - All structures for parent lookup
 * @returns Depth from root (0 = root)
 */
export function calculateDepth(
  structure: Structure,
  structures: Structure[]
): number {
  let depth = 0;
  let current: Structure | undefined = structure;

  while (current?.parentId) {
    const parent = structures.find((s) => s.id === current!.parentId);
    if (!parent) break;
    current = parent;
    depth++;
  }

  return depth;
}

/**
 * Get ancestors of a structure from parent to root
 *
 * @param structure - Starting structure
 * @param structures - All structures for parent lookup
 * @returns Array of ancestors (parent first, root last)
 */
export function getAncestors(
  structure: Structure,
  structures: Structure[]
): Structure[] {
  const ancestors: Structure[] = [];
  let current: Structure | undefined = structure;

  while (current?.parentId) {
    const parent = structures.find((s) => s.id === current!.parentId);
    if (!parent) break;
    ancestors.push(parent);
    current = parent;
  }

  return ancestors;
}

/**
 * Get the full path from root to a structure
 *
 * @param structure - Target structure
 * @param structures - All structures for parent lookup
 * @returns Array of path segments from root to target (inclusive)
 */
export function getPath(
  structure: Structure,
  structures: Structure[]
): PathSegment[] {
  const ancestors = getAncestors(structure, structures);

  // Reverse to get root-first order, then add the target
  const path: PathSegment[] = ancestors.reverse().map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    order: s.order,
  }));

  path.push({
    id: structure.id,
    type: structure.type,
    title: structure.title,
    order: structure.order,
  });

  return path;
}

/**
 * Get a human-readable path string
 *
 * @param structure - Target structure
 * @param structures - All structures for parent lookup
 * @param separator - Path separator (default: " > ")
 * @returns Formatted path string
 */
export function getPathString(
  structure: Structure,
  structures: Structure[],
  separator: string = ' > '
): string {
  const path = getPath(structure, structures);
  return path.map((p) => p.title).join(separator);
}

/**
 * Get all descendants of a structure
 *
 * @param structure - Starting structure (must have children loaded)
 * @param options - Traversal options
 * @returns Array of descendant structures
 */
export function getDescendants(
  structure: Structure,
  options: TraversalOptions = {}
): Structure[] {
  const {
    includeSelf = false,
    maxDepth,
    filterType,
    stopWhen,
  } = options;

  const results: Structure[] = [];

  if (includeSelf) {
    if (!filterType || structure.type === filterType) {
      results.push(structure);
    }
    if (stopWhen?.(structure)) {
      return results;
    }
  }

  function traverse(node: Structure, depth: number): void {
    if (maxDepth !== undefined && depth >= maxDepth) return;

    const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
    for (const child of sortedChildren) {
      if (!filterType || child.type === filterType) {
        results.push(child);
      }
      if (stopWhen?.(child)) {
        continue; // Stop traversing this branch but continue siblings
      }
      traverse(child, depth + 1);
    }
  }

  traverse(structure, 0);
  return results;
}

/**
 * Linearize a structure tree into reading order
 *
 * @param root - Root structure (must have children loaded)
 * @param filterType - Optional type filter
 * @returns Structures in reading order
 */
export function linearize(
  root: Structure,
  filterType?: StructureType
): Structure[] {
  const results: Structure[] = [];

  function traverse(node: Structure): void {
    if (!filterType || node.type === filterType) {
      results.push(node);
    }

    const sortedChildren = [...node.children].sort((a, b) => a.order - b.order);
    for (const child of sortedChildren) {
      traverse(child);
    }
  }

  traverse(root);
  return results;
}

/**
 * Find the common ancestor of two structures
 *
 * @param structureA - First structure
 * @param structureB - Second structure
 * @param structures - All structures for parent lookup
 * @returns Common ancestor or undefined if none exists
 */
export function findCommonAncestor(
  structureA: Structure,
  structureB: Structure,
  structures: Structure[]
): Structure | undefined {
  const ancestorsA = new Set([structureA.id, ...getAncestors(structureA, structures).map((s) => s.id)]);

  // Check structureB and its ancestors
  if (ancestorsA.has(structureB.id)) {
    return structureB;
  }

  for (const ancestor of getAncestors(structureB, structures)) {
    if (ancestorsA.has(ancestor.id)) {
      return ancestor;
    }
  }

  return undefined;
}

/**
 * Check if one structure is an ancestor of another
 *
 * @param potentialAncestor - Structure to check as ancestor
 * @param potentialDescendant - Structure to check as descendant
 * @param structures - All structures for parent lookup
 * @returns true if potentialAncestor is an ancestor of potentialDescendant
 */
export function isAncestorOf(
  potentialAncestor: Structure,
  potentialDescendant: Structure,
  structures: Structure[]
): boolean {
  const ancestors = getAncestors(potentialDescendant, structures);
  return ancestors.some((a) => a.id === potentialAncestor.id);
}

/**
 * Find siblings of a structure
 *
 * @param structure - Target structure
 * @param structures - All structures for lookup
 * @param includeSelf - Whether to include the target in results
 * @returns Sibling structures sorted by order
 */
export function getSiblings(
  structure: Structure,
  structures: Structure[],
  includeSelf: boolean = false
): Structure[] {
  const siblings = structures.filter((s) =>
    s.parentId === structure.parentId &&
    (includeSelf || s.id !== structure.id)
  );

  return siblings.sort((a, b) => a.order - b.order);
}

/**
 * Get the next sibling in order
 *
 * @param structure - Current structure
 * @param structures - All structures for lookup
 * @returns Next sibling or undefined
 */
export function getNextSibling(
  structure: Structure,
  structures: Structure[]
): Structure | undefined {
  const siblings = getSiblings(structure, structures, true);
  const currentIndex = siblings.findIndex((s) => s.id === structure.id);

  if (currentIndex === -1 || currentIndex === siblings.length - 1) {
    return undefined;
  }

  return siblings[currentIndex + 1];
}

/**
 * Get the previous sibling in order
 *
 * @param structure - Current structure
 * @param structures - All structures for lookup
 * @returns Previous sibling or undefined
 */
export function getPreviousSibling(
  structure: Structure,
  structures: Structure[]
): Structure | undefined {
  const siblings = getSiblings(structure, structures, true);
  const currentIndex = siblings.findIndex((s) => s.id === structure.id);

  if (currentIndex <= 0) {
    return undefined;
  }

  return siblings[currentIndex - 1];
}

/**
 * Find the next structure in reading order
 *
 * @param structure - Current structure
 * @param root - Root of the tree (must have children loaded)
 * @returns Next structure in reading order or undefined
 */
export function getNextInReadingOrder(
  structure: Structure,
  root: Structure
): Structure | undefined {
  const linearized = linearize(root);
  const currentIndex = linearized.findIndex((s) => s.id === structure.id);

  if (currentIndex === -1 || currentIndex === linearized.length - 1) {
    return undefined;
  }

  return linearized[currentIndex + 1];
}

/**
 * Find the previous structure in reading order
 *
 * @param structure - Current structure
 * @param root - Root of the tree (must have children loaded)
 * @returns Previous structure in reading order or undefined
 */
export function getPreviousInReadingOrder(
  structure: Structure,
  root: Structure
): Structure | undefined {
  const linearized = linearize(root);
  const currentIndex = linearized.findIndex((s) => s.id === structure.id);

  if (currentIndex <= 0) {
    return undefined;
  }

  return linearized[currentIndex - 1];
}

/**
 * Validate the structure tree for issues
 *
 * @param structures - All structures to validate
 * @returns Validation result with issues
 */
export function validateTree(structures: Structure[]): TreeValidationResult {
  const issues: TreeValidationIssue[] = [];
  const structureMap = new Map(structures.map((s) => [s.id, s]));

  // Track seen IDs for circular reference detection
  function checkCircular(id: string, visited: Set<string>): boolean {
    if (visited.has(id)) return true;

    const structure = structureMap.get(id);
    if (!structure?.parentId) return false;

    visited.add(id);
    return checkCircular(structure.parentId, visited);
  }

  for (const structure of structures) {
    // Check for missing parent
    if (structure.parentId) {
      const parent = structureMap.get(structure.parentId);
      if (!parent) {
        issues.push({
          structureId: structure.id,
          issueType: 'missing_parent',
          message: `Parent structure "${structure.parentId}" not found`,
          severity: 'error',
        });
        continue;
      }

      // Check parent-child validity
      if (!isValidParentChild(parent.type, structure.type)) {
        issues.push({
          structureId: structure.id,
          issueType: 'invalid_parent_child',
          message: `Invalid relationship: ${parent.type} cannot contain ${structure.type}`,
          severity: 'error',
        });
      }
    } else {
      // Root level structure
      if (structure.type !== 'book') {
        issues.push({
          structureId: structure.id,
          issueType: 'invalid_root',
          message: `Only books can be at root level, found ${structure.type}`,
          severity: 'error',
        });
      }
    }

    // Check for circular references
    if (checkCircular(structure.id, new Set())) {
      issues.push({
        structureId: structure.id,
        issueType: 'circular',
        message: 'Circular parent reference detected',
        severity: 'error',
      });
    }
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Find structures by type within a subtree
 *
 * @param root - Root of subtree (must have children loaded)
 * @param type - Type to find
 * @returns Structures of the specified type in reading order
 */
export function findByType(root: Structure, type: StructureType): Structure[] {
  return linearize(root, type);
}

/**
 * Count structures by type in a subtree
 *
 * @param root - Root of subtree (must have children loaded)
 * @returns Count per structure type
 */
export function countByType(root: Structure): Record<StructureType, number> {
  const counts: Record<StructureType, number> = {
    book: 0,
    arc: 0,
    chapter: 0,
    scene: 0,
  };

  const all = linearize(root);
  for (const structure of all) {
    counts[structure.type]++;
  }

  return counts;
}

/**
 * Get leaf nodes (structures with no children)
 *
 * @param root - Root of subtree (must have children loaded)
 * @returns Leaf structures in reading order
 */
export function getLeafNodes(root: Structure): Structure[] {
  const all = linearize(root);
  return all.filter((s) => s.children.length === 0);
}

/**
 * Check if a structure is a leaf node
 *
 * @param structure - Structure to check
 * @returns true if the structure has no children
 */
export function isLeafNode(structure: Structure): boolean {
  return structure.children.length === 0;
}

/**
 * Check if moving a structure to a new parent would be valid
 *
 * @param structure - Structure to move
 * @param newParent - New parent structure (or null for root)
 * @param structures - All structures for validation
 * @returns Object with valid flag and optional reason
 */
export function canMoveTo(
  structure: Structure,
  newParent: Structure | null,
  structures: Structure[]
): { valid: boolean; reason?: string } {
  // Check parent-child type validity
  const parentType = newParent?.type ?? null;
  if (!isValidParentChild(parentType, structure.type)) {
    return {
      valid: false,
      reason: `${parentType ?? 'root'} cannot contain ${structure.type}`,
    };
  }

  // Check for circular reference (can't move into own descendant)
  if (newParent && isAncestorOf(structure, newParent, structures)) {
    return {
      valid: false,
      reason: 'Cannot move a structure into its own descendant',
    };
  }

  return { valid: true };
}
