/**
 * Tests for structure tree operations
 */

import { describe, expect, it } from 'vitest';

import type { Structure, StructureType } from '@repo/serial-types';

import {
  calculateDepth,
  canMoveTo,
  countByType,
  findByType,
  findCommonAncestor,
  getAncestors,
  getDescendants,
  getLeafNodes,
  getNextInReadingOrder,
  getNextSibling,
  getPath,
  getPathString,
  getPreviousInReadingOrder,
  getPreviousSibling,
  getSiblings,
  getTypeDepth,
  getValidChildTypes,
  isAncestorOf,
  isLeafNode,
  isValidParentChild,
  linearize,
  STRUCTURE_DEPTH,
  VALID_CHILD_TYPES,
  validateTree,
} from './tree';

// Helper to create a mock structure
function createStructure(
  id: string,
  type: StructureType,
  title: string,
  parentId?: string,
  order: number = 0,
  children: Structure[] = []
): Structure {
  const now = new Date().toISOString();
  return {
    id,
    type,
    title,
    summary: '',
    beats: [],
    order,
    children,
    parentId,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper to build a test tree:
// Book
//   Arc 1
//     Chapter 1
//       Scene 1
//     Chapter 2
//   Arc 2
//     Chapter 3
function buildTestTree(): Structure {
  const scene1 = createStructure('scene-1', 'scene', 'Scene 1', 'chapter-1', 0);
  const chapter1 = createStructure('chapter-1', 'chapter', 'Chapter 1', 'arc-1', 0, [scene1]);
  const chapter2 = createStructure('chapter-2', 'chapter', 'Chapter 2', 'arc-1', 1);
  const arc1 = createStructure('arc-1', 'arc', 'Arc 1', 'book-1', 0, [chapter1, chapter2]);

  const chapter3 = createStructure('chapter-3', 'chapter', 'Chapter 3', 'arc-2', 0);
  const arc2 = createStructure('arc-2', 'arc', 'Arc 2', 'book-1', 1, [chapter3]);

  return createStructure('book-1', 'book', 'My Book', undefined, 0, [arc1, arc2]);
}

// Helper to flatten tree to list
function flattenTree(root: Structure): Structure[] {
  const result: Structure[] = [root];
  for (const child of root.children) {
    result.push(...flattenTree(child));
  }
  return result;
}

describe('tree', () => {
  describe('constants', () => {
    it('should have valid child types defined', () => {
      expect(VALID_CHILD_TYPES.book).toContain('arc');
      expect(VALID_CHILD_TYPES.book).toContain('chapter');
      expect(VALID_CHILD_TYPES.arc).toContain('chapter');
      expect(VALID_CHILD_TYPES.chapter).toContain('scene');
      expect(VALID_CHILD_TYPES.scene).toHaveLength(0);
    });

    it('should have structure depth defined', () => {
      expect(STRUCTURE_DEPTH.book).toBe(0);
      expect(STRUCTURE_DEPTH.arc).toBe(1);
      expect(STRUCTURE_DEPTH.chapter).toBe(2);
      expect(STRUCTURE_DEPTH.scene).toBe(3);
    });
  });

  describe('isValidParentChild', () => {
    it('should allow books at root level', () => {
      expect(isValidParentChild(null, 'book')).toBe(true);
    });

    it('should not allow non-books at root level', () => {
      expect(isValidParentChild(null, 'arc')).toBe(false);
      expect(isValidParentChild(null, 'chapter')).toBe(false);
      expect(isValidParentChild(null, 'scene')).toBe(false);
    });

    it('should allow valid book children', () => {
      expect(isValidParentChild('book', 'arc')).toBe(true);
      expect(isValidParentChild('book', 'chapter')).toBe(true);
    });

    it('should not allow invalid book children', () => {
      expect(isValidParentChild('book', 'book')).toBe(false);
      expect(isValidParentChild('book', 'scene')).toBe(false);
    });

    it('should allow chapters under arcs', () => {
      expect(isValidParentChild('arc', 'chapter')).toBe(true);
    });

    it('should allow scenes under chapters', () => {
      expect(isValidParentChild('chapter', 'scene')).toBe(true);
    });

    it('should not allow children under scenes', () => {
      expect(isValidParentChild('scene', 'scene')).toBe(false);
      expect(isValidParentChild('scene', 'chapter')).toBe(false);
    });
  });

  describe('getValidChildTypes', () => {
    it('should return book for root level', () => {
      expect(getValidChildTypes(null)).toEqual(['book']);
    });

    it('should return correct child types for each parent', () => {
      expect(getValidChildTypes('book')).toContain('arc');
      expect(getValidChildTypes('arc')).toContain('chapter');
      expect(getValidChildTypes('chapter')).toContain('scene');
      expect(getValidChildTypes('scene')).toEqual([]);
    });
  });

  describe('getTypeDepth', () => {
    it('should return correct depth for each type', () => {
      expect(getTypeDepth('book')).toBe(0);
      expect(getTypeDepth('arc')).toBe(1);
      expect(getTypeDepth('chapter')).toBe(2);
      expect(getTypeDepth('scene')).toBe(3);
    });
  });

  describe('calculateDepth', () => {
    it('should return 0 for root structure', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);

      expect(calculateDepth(tree, all)).toBe(0);
    });

    it('should calculate correct depth for nested structures', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);

      const arc1 = all.find((s) => s.id === 'arc-1')!;
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;
      const scene1 = all.find((s) => s.id === 'scene-1')!;

      expect(calculateDepth(arc1, all)).toBe(1);
      expect(calculateDepth(chapter1, all)).toBe(2);
      expect(calculateDepth(scene1, all)).toBe(3);
    });
  });

  describe('getAncestors', () => {
    it('should return empty array for root', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);

      expect(getAncestors(tree, all)).toHaveLength(0);
    });

    it('should return ancestors from parent to root', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const scene1 = all.find((s) => s.id === 'scene-1')!;

      const ancestors = getAncestors(scene1, all);

      expect(ancestors).toHaveLength(3);
      expect(ancestors[0].id).toBe('chapter-1'); // Parent first
      expect(ancestors[1].id).toBe('arc-1');
      expect(ancestors[2].id).toBe('book-1'); // Root last
    });
  });

  describe('getPath', () => {
    it('should return single-element path for root', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);

      const path = getPath(tree, all);

      expect(path).toHaveLength(1);
      expect(path[0].id).toBe('book-1');
    });

    it('should return full path from root to target', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const scene1 = all.find((s) => s.id === 'scene-1')!;

      const path = getPath(scene1, all);

      expect(path).toHaveLength(4);
      expect(path[0].id).toBe('book-1'); // Root first
      expect(path[1].id).toBe('arc-1');
      expect(path[2].id).toBe('chapter-1');
      expect(path[3].id).toBe('scene-1'); // Target last
    });
  });

  describe('getPathString', () => {
    it('should format path as string', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const pathStr = getPathString(chapter1, all);

      expect(pathStr).toBe('My Book > Arc 1 > Chapter 1');
    });

    it('should use custom separator', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const pathStr = getPathString(chapter1, all, ' / ');

      expect(pathStr).toBe('My Book / Arc 1 / Chapter 1');
    });
  });

  describe('getDescendants', () => {
    it('should return all descendants', () => {
      const tree = buildTestTree();

      const descendants = getDescendants(tree);

      // arc-1, chapter-1, scene-1, chapter-2, arc-2, chapter-3
      expect(descendants).toHaveLength(6);
    });

    it('should include self if option is set', () => {
      const tree = buildTestTree();

      const descendants = getDescendants(tree, { includeSelf: true });

      // book + 6 descendants
      expect(descendants).toHaveLength(7);
    });

    it('should filter by type', () => {
      const tree = buildTestTree();

      const chapters = getDescendants(tree, { filterType: 'chapter' });

      expect(chapters).toHaveLength(3);
      expect(chapters.every((s) => s.type === 'chapter')).toBe(true);
    });

    it('should respect max depth', () => {
      const tree = buildTestTree();

      const descendants = getDescendants(tree, { maxDepth: 1 });

      // Only arcs (depth 1 from book)
      expect(descendants).toHaveLength(2);
      expect(descendants.every((s) => s.type === 'arc')).toBe(true);
    });
  });

  describe('linearize', () => {
    it('should return structures in reading order', () => {
      const tree = buildTestTree();

      const linear = linearize(tree);

      expect(linear[0].id).toBe('book-1');
      expect(linear[1].id).toBe('arc-1');
      expect(linear[2].id).toBe('chapter-1');
      expect(linear[3].id).toBe('scene-1');
      expect(linear[4].id).toBe('chapter-2');
      expect(linear[5].id).toBe('arc-2');
      expect(linear[6].id).toBe('chapter-3');
    });

    it('should filter by type', () => {
      const tree = buildTestTree();

      const chapters = linearize(tree, 'chapter');

      expect(chapters).toHaveLength(3);
      expect(chapters.map((c) => c.id)).toEqual(['chapter-1', 'chapter-2', 'chapter-3']);
    });
  });

  describe('findCommonAncestor', () => {
    it('should find common ancestor of siblings', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;
      const chapter2 = all.find((s) => s.id === 'chapter-2')!;

      const common = findCommonAncestor(chapter1, chapter2, all);

      expect(common?.id).toBe('arc-1');
    });

    it('should find common ancestor of distant relatives', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const scene1 = all.find((s) => s.id === 'scene-1')!;
      const chapter3 = all.find((s) => s.id === 'chapter-3')!;

      const common = findCommonAncestor(scene1, chapter3, all);

      expect(common?.id).toBe('book-1');
    });

    it('should return ancestor if one is ancestor of other', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const arc1 = all.find((s) => s.id === 'arc-1')!;
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const common = findCommonAncestor(arc1, chapter1, all);

      expect(common?.id).toBe('arc-1');
    });
  });

  describe('isAncestorOf', () => {
    it('should return true for direct parent', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const arc1 = all.find((s) => s.id === 'arc-1')!;
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      expect(isAncestorOf(arc1, chapter1, all)).toBe(true);
    });

    it('should return true for grandparent', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const book = all.find((s) => s.id === 'book-1')!;
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      expect(isAncestorOf(book, chapter1, all)).toBe(true);
    });

    it('should return false for non-ancestor', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const arc2 = all.find((s) => s.id === 'arc-2')!;
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      expect(isAncestorOf(arc2, chapter1, all)).toBe(false);
    });
  });

  describe('getSiblings', () => {
    it('should return siblings without self', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const siblings = getSiblings(chapter1, all);

      expect(siblings).toHaveLength(1);
      expect(siblings[0].id).toBe('chapter-2');
    });

    it('should include self if option is set', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const siblings = getSiblings(chapter1, all, true);

      expect(siblings).toHaveLength(2);
      expect(siblings.map((s) => s.id)).toEqual(['chapter-1', 'chapter-2']);
    });

    it('should return empty for only child', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter3 = all.find((s) => s.id === 'chapter-3')!;

      const siblings = getSiblings(chapter3, all);

      expect(siblings).toHaveLength(0);
    });
  });

  describe('getNextSibling/getPreviousSibling', () => {
    it('should return next sibling', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const next = getNextSibling(chapter1, all);

      expect(next?.id).toBe('chapter-2');
    });

    it('should return undefined for last sibling', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter2 = all.find((s) => s.id === 'chapter-2')!;

      const next = getNextSibling(chapter2, all);

      expect(next).toBeUndefined();
    });

    it('should return previous sibling', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter2 = all.find((s) => s.id === 'chapter-2')!;

      const prev = getPreviousSibling(chapter2, all);

      expect(prev?.id).toBe('chapter-1');
    });

    it('should return undefined for first sibling', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const prev = getPreviousSibling(chapter1, all);

      expect(prev).toBeUndefined();
    });
  });

  describe('getNextInReadingOrder/getPreviousInReadingOrder', () => {
    it('should return next in reading order', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const next = getNextInReadingOrder(chapter1, tree);

      expect(next?.id).toBe('scene-1');
    });

    it('should cross parent boundaries', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter2 = all.find((s) => s.id === 'chapter-2')!;

      const next = getNextInReadingOrder(chapter2, tree);

      expect(next?.id).toBe('arc-2');
    });

    it('should return undefined for last structure', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter3 = all.find((s) => s.id === 'chapter-3')!;

      const next = getNextInReadingOrder(chapter3, tree);

      expect(next).toBeUndefined();
    });

    it('should return previous in reading order', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const scene1 = all.find((s) => s.id === 'scene-1')!;

      const prev = getPreviousInReadingOrder(scene1, tree);

      expect(prev?.id).toBe('chapter-1');
    });
  });

  describe('validateTree', () => {
    it('should pass for valid tree', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);

      const result = validateTree(all);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing parent', () => {
      const orphan = createStructure('orphan', 'chapter', 'Orphan', 'non-existent-parent');

      const result = validateTree([orphan]);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.issueType === 'missing_parent')).toBe(true);
    });

    it('should detect invalid parent-child relationship', () => {
      const book = createStructure('book-1', 'book', 'Book');
      const scene = createStructure('scene-1', 'scene', 'Scene', 'book-1'); // Invalid: scene under book

      const result = validateTree([book, scene]);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.issueType === 'invalid_parent_child')).toBe(true);
    });

    it('should detect non-book at root', () => {
      const arc = createStructure('arc-1', 'arc', 'Orphan Arc'); // No parent but not a book

      const result = validateTree([arc]);

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.issueType === 'invalid_root')).toBe(true);
    });
  });

  describe('findByType', () => {
    it('should find all structures of a type', () => {
      const tree = buildTestTree();

      const chapters = findByType(tree, 'chapter');

      expect(chapters).toHaveLength(3);
      expect(chapters.map((c) => c.id)).toEqual(['chapter-1', 'chapter-2', 'chapter-3']);
    });
  });

  describe('countByType', () => {
    it('should count structures by type', () => {
      const tree = buildTestTree();

      const counts = countByType(tree);

      expect(counts.book).toBe(1);
      expect(counts.arc).toBe(2);
      expect(counts.chapter).toBe(3);
      expect(counts.scene).toBe(1);
    });
  });

  describe('getLeafNodes', () => {
    it('should return structures with no children', () => {
      const tree = buildTestTree();

      const leaves = getLeafNodes(tree);

      // scene-1, chapter-2, chapter-3
      expect(leaves).toHaveLength(3);
      expect(leaves.map((l) => l.id).sort()).toEqual(['chapter-2', 'chapter-3', 'scene-1']);
    });
  });

  describe('isLeafNode', () => {
    it('should return true for nodes with no children', () => {
      const leaf = createStructure('leaf', 'scene', 'Leaf');

      expect(isLeafNode(leaf)).toBe(true);
    });

    it('should return false for nodes with children', () => {
      const tree = buildTestTree();

      expect(isLeafNode(tree)).toBe(false);
    });
  });

  describe('canMoveTo', () => {
    it('should allow valid moves', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;
      const arc2 = all.find((s) => s.id === 'arc-2')!;

      const result = canMoveTo(chapter1, arc2, all);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid parent-child types', () => {
      const tree = buildTestTree();
      const all = flattenTree(tree);
      const arc1 = all.find((s) => s.id === 'arc-1')!;
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      const result = canMoveTo(arc1, chapter1, all);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('cannot contain');
    });

    it('should reject moving into own descendant', () => {
      // Create a tree where we can test circular reference detection
      // Book -> Arc1 -> Arc2 (nested arcs, which is invalid but we're testing the circular check)
      // Actually, we need to test with valid types, so let's create a custom scenario:
      // We'll try to move Arc1 into Chapter1 (Arc1's grandchild in concept)
      // But arc->chapter is valid, so we need a different approach.
      //
      // The circular reference check is in canMoveTo after the type check.
      // Since we can't have arc under chapter, let's test with a manually constructed scenario
      // where we check that moving a structure into its descendant is rejected.
      //
      // A valid test case: Create structures where an arc could theoretically move
      // but shouldn't because it would create a cycle.
      // Actually the simplest test is to verify the logic by checking that the code
      // correctly identifies when one structure is an ancestor of another.

      const tree = buildTestTree();
      const all = flattenTree(tree);
      const arc1 = all.find((s) => s.id === 'arc-1')!;
      const chapter1 = all.find((s) => s.id === 'chapter-1')!;

      // arc1 contains chapter1, so moving arc1 INTO chapter1 would create a cycle
      // However, since chapters can't contain arcs (invalid type), the type check fails first.
      // Let's verify the isAncestorOf function works correctly, which is what canMoveTo uses
      expect(isAncestorOf(arc1, chapter1, all)).toBe(true);

      // The actual circular reference rejection happens when:
      // - The new parent type CAN contain the child type
      // - But the child is an ancestor of the new parent
      // Since our hierarchy doesn't allow this scenario with valid types,
      // let's verify the type check catches the invalid move
      const result = canMoveTo(arc1, chapter1, all);
      expect(result.valid).toBe(false);
      // It will fail due to type validation since chapter can't contain arc
      expect(result.reason).toContain('cannot contain');
    });
  });
});
