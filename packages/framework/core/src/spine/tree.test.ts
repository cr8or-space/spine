/**
 * Tests for tree spine implementation.
 */

import { describe, it, expect } from 'vitest';

import {
  createTreeSpine,
  createEmptyTreeSpine,
  createTreeSpineBuilder,
  pathToRoot,
  lowestCommonAncestor,
  getLeafNodes,
  getNodesAtDepth,
  type TreeSpineConfig,
} from './tree';

interface TestNode {
  id: string;
  parentId: string | null;
  title: string;
  order: number;
}

const config: TreeSpineConfig<TestNode> = {
  getId: (node) => node.id,
  getParentId: (node) => node.parentId,
  getOrder: (node) => node.order,
};

// Structure: book -> arc1 -> ch1, ch2
//                 -> arc2 -> ch3
const testNodes: TestNode[] = [
  { id: 'book', parentId: null, title: 'Book', order: 0 },
  { id: 'arc1', parentId: 'book', title: 'Arc 1', order: 1 },
  { id: 'arc2', parentId: 'book', title: 'Arc 2', order: 2 },
  { id: 'ch1', parentId: 'arc1', title: 'Chapter 1', order: 1 },
  { id: 'ch2', parentId: 'arc1', title: 'Chapter 2', order: 2 },
  { id: 'ch3', parentId: 'arc2', title: 'Chapter 3', order: 1 },
];

describe('createTreeSpine', () => {
  const spine = createTreeSpine(testNodes, config);

  describe('Spine interface', () => {
    it('roots returns root nodes', () => {
      const roots = spine.roots();
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('book');
    });

    it('children returns child nodes', () => {
      const book = testNodes.find((n) => n.id === 'book')!;
      const children = spine.children(book);
      expect(children).toHaveLength(2);
      expect(children.map((n) => n.id)).toEqual(['arc1', 'arc2']);
    });

    it('children returns empty for leaf nodes', () => {
      const ch1 = testNodes.find((n) => n.id === 'ch1')!;
      expect(spine.children(ch1)).toEqual([]);
    });

    it('parent returns parent node', () => {
      const arc1 = testNodes.find((n) => n.id === 'arc1')!;
      const ch1 = testNodes.find((n) => n.id === 'ch1')!;

      expect(spine.parent(arc1)?.id).toBe('book');
      expect(spine.parent(ch1)?.id).toBe('arc1');
    });

    it('parent returns null for root', () => {
      const book = testNodes.find((n) => n.id === 'book')!;
      expect(spine.parent(book)).toBeNull();
    });

    it('linearize returns depth-first order', () => {
      const linear = spine.linearize();
      expect(linear.map((n) => n.id)).toEqual(['book', 'arc1', 'ch1', 'ch2', 'arc2', 'ch3']);
    });

    it('position returns linearized index', () => {
      const book = testNodes.find((n) => n.id === 'book')!;
      const ch2 = testNodes.find((n) => n.id === 'ch2')!;
      const ch3 = testNodes.find((n) => n.id === 'ch3')!;

      expect(spine.position(book)).toBe(0);
      expect(spine.position(ch2)).toBe(3);
      expect(spine.position(ch3)).toBe(5);
    });
  });

  describe('TreeSpine interface', () => {
    it('depth returns node depth', () => {
      const book = testNodes.find((n) => n.id === 'book')!;
      const arc1 = testNodes.find((n) => n.id === 'arc1')!;
      const ch1 = testNodes.find((n) => n.id === 'ch1')!;

      expect(spine.depth(book)).toBe(0);
      expect(spine.depth(arc1)).toBe(1);
      expect(spine.depth(ch1)).toBe(2);
    });

    it('depth returns -1 for unknown node', () => {
      const unknown = { id: 'unknown', parentId: null, title: 'Unknown', order: 0 };
      expect(spine.depth(unknown)).toBe(-1);
    });

    it('ancestors returns path to root', () => {
      const ch1 = testNodes.find((n) => n.id === 'ch1')!;
      const ancestors = spine.ancestors(ch1);

      expect(ancestors.map((n) => n.id)).toEqual(['arc1', 'book']);
    });

    it('ancestors returns empty for root', () => {
      const book = testNodes.find((n) => n.id === 'book')!;
      expect(spine.ancestors(book)).toEqual([]);
    });

    it('descendants returns all descendants', () => {
      const arc1 = testNodes.find((n) => n.id === 'arc1')!;
      const descendants = spine.descendants(arc1);

      expect(descendants.map((n) => n.id)).toEqual(['ch1', 'ch2']);
    });

    it('descendants returns empty for leaf', () => {
      const ch1 = testNodes.find((n) => n.id === 'ch1')!;
      expect(spine.descendants(ch1)).toEqual([]);
    });
  });
});

describe('createEmptyTreeSpine', () => {
  it('creates empty spine', () => {
    const spine = createEmptyTreeSpine(config);
    expect(spine.roots()).toEqual([]);
    expect(spine.linearize()).toEqual([]);
  });
});

describe('createTreeSpineBuilder', () => {
  it('builds spine incrementally', () => {
    const builder = createTreeSpineBuilder(config);

    builder.add({ id: 'root', parentId: null, title: 'Root', order: 0 });
    builder.add({ id: 'child', parentId: 'root', title: 'Child', order: 1 });

    const spine = builder.build();
    expect(spine.roots()).toHaveLength(1);
    expect(spine.linearize()).toHaveLength(2);
  });
});

describe('pathToRoot', () => {
  const spine = createTreeSpine(testNodes, config);

  it('returns path from root to node', () => {
    const ch1 = testNodes.find((n) => n.id === 'ch1')!;
    const path = pathToRoot(spine, ch1);

    expect(path.map((n) => n.id)).toEqual(['book', 'arc1', 'ch1']);
  });

  it('returns single node for root', () => {
    const book = testNodes.find((n) => n.id === 'book')!;
    const path = pathToRoot(spine, book);

    expect(path.map((n) => n.id)).toEqual(['book']);
  });
});

describe('lowestCommonAncestor', () => {
  const spine = createTreeSpine(testNodes, config);

  it('finds LCA of siblings', () => {
    const ch1 = testNodes.find((n) => n.id === 'ch1')!;
    const ch2 = testNodes.find((n) => n.id === 'ch2')!;

    const lca = lowestCommonAncestor(spine, ch1, ch2, (n) => n.id);
    expect(lca?.id).toBe('arc1');
  });

  it('finds LCA of cousins', () => {
    const ch1 = testNodes.find((n) => n.id === 'ch1')!;
    const ch3 = testNodes.find((n) => n.id === 'ch3')!;

    const lca = lowestCommonAncestor(spine, ch1, ch3, (n) => n.id);
    expect(lca?.id).toBe('book');
  });

  it('finds LCA when one is ancestor of other', () => {
    const arc1 = testNodes.find((n) => n.id === 'arc1')!;
    const ch1 = testNodes.find((n) => n.id === 'ch1')!;

    const lca = lowestCommonAncestor(spine, arc1, ch1, (n) => n.id);
    expect(lca?.id).toBe('arc1');
  });

  it('returns node itself for same node', () => {
    const ch1 = testNodes.find((n) => n.id === 'ch1')!;

    const lca = lowestCommonAncestor(spine, ch1, ch1, (n) => n.id);
    expect(lca?.id).toBe('ch1');
  });
});

describe('getLeafNodes', () => {
  it('returns all leaf nodes', () => {
    const spine = createTreeSpine(testNodes, config);
    const leaves = getLeafNodes(spine);

    expect(leaves.map((n) => n.id).sort()).toEqual(['ch1', 'ch2', 'ch3']);
  });
});

describe('getNodesAtDepth', () => {
  const spine = createTreeSpine(testNodes, config);

  it('returns nodes at depth 0', () => {
    const nodes = getNodesAtDepth(spine, 0);
    expect(nodes.map((n) => n.id)).toEqual(['book']);
  });

  it('returns nodes at depth 1', () => {
    const nodes = getNodesAtDepth(spine, 1);
    expect(nodes.map((n) => n.id)).toEqual(['arc1', 'arc2']);
  });

  it('returns nodes at depth 2', () => {
    const nodes = getNodesAtDepth(spine, 2);
    expect(nodes.map((n) => n.id)).toEqual(['ch1', 'ch2', 'ch3']);
  });

  it('returns empty for non-existent depth', () => {
    const nodes = getNodesAtDepth(spine, 10);
    expect(nodes).toEqual([]);
  });
});
