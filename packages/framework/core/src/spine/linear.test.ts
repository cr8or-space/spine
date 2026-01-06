/**
 * Tests for linear spine implementation.
 */

import { describe, it, expect } from 'vitest';

import {
  createLinearSpine,
  createEmptyLinearSpine,
  createLinearSpineBuilder,
  type LinearSpineConfig,
} from './linear';

interface TestNode {
  id: string;
  title: string;
  order: number;
}

const config: LinearSpineConfig<TestNode> = {
  getId: (node) => node.id,
  getOrder: (node) => node.order,
};

const testNodes: TestNode[] = [
  { id: 'ch1', title: 'Chapter 1', order: 1 },
  { id: 'ch2', title: 'Chapter 2', order: 2 },
  { id: 'ch3', title: 'Chapter 3', order: 3 },
];

describe('createLinearSpine', () => {
  it('creates spine from nodes', () => {
    const spine = createLinearSpine(testNodes, config);
    expect(spine.length()).toBe(3);
  });

  it('sorts nodes by order', () => {
    const unordered: TestNode[] = [
      { id: 'ch3', title: 'Chapter 3', order: 3 },
      { id: 'ch1', title: 'Chapter 1', order: 1 },
      { id: 'ch2', title: 'Chapter 2', order: 2 },
    ];

    const spine = createLinearSpine(unordered, config);
    const linear = spine.linearize();

    expect(linear[0].id).toBe('ch1');
    expect(linear[1].id).toBe('ch2');
    expect(linear[2].id).toBe('ch3');
  });

  describe('Spine interface', () => {
    const spine = createLinearSpine(testNodes, config);

    it('roots returns first node', () => {
      const roots = spine.roots();
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('ch1');
    });

    it('children returns empty array', () => {
      expect(spine.children(testNodes[0])).toEqual([]);
    });

    it('parent returns null', () => {
      expect(spine.parent(testNodes[0])).toBeNull();
    });

    it('linearize returns ordered nodes', () => {
      const linear = spine.linearize();
      expect(linear).toHaveLength(3);
      expect(linear.map((n) => n.id)).toEqual(['ch1', 'ch2', 'ch3']);
    });

    it('position returns index', () => {
      expect(spine.position(testNodes[0])).toBe(0);
      expect(spine.position(testNodes[1])).toBe(1);
      expect(spine.position(testNodes[2])).toBe(2);
    });
  });

  describe('LinearSpine interface', () => {
    const spine = createLinearSpine(testNodes, config);

    it('first returns first node', () => {
      expect(spine.first()?.id).toBe('ch1');
    });

    it('last returns last node', () => {
      expect(spine.last()?.id).toBe('ch3');
    });

    it('next returns next node', () => {
      expect(spine.next(testNodes[0])?.id).toBe('ch2');
      expect(spine.next(testNodes[1])?.id).toBe('ch3');
      expect(spine.next(testNodes[2])).toBeNull();
    });

    it('previous returns previous node', () => {
      expect(spine.previous(testNodes[0])).toBeNull();
      expect(spine.previous(testNodes[1])?.id).toBe('ch1');
      expect(spine.previous(testNodes[2])?.id).toBe('ch2');
    });

    it('at returns node at index', () => {
      expect(spine.at(0)?.id).toBe('ch1');
      expect(spine.at(1)?.id).toBe('ch2');
      expect(spine.at(2)?.id).toBe('ch3');
      expect(spine.at(-1)).toBeNull();
      expect(spine.at(3)).toBeNull();
    });

    it('length returns node count', () => {
      expect(spine.length()).toBe(3);
    });
  });
});

describe('createEmptyLinearSpine', () => {
  it('creates empty spine', () => {
    const spine = createEmptyLinearSpine(config);
    expect(spine.length()).toBe(0);
    expect(spine.first()).toBeNull();
    expect(spine.last()).toBeNull();
    expect(spine.roots()).toEqual([]);
  });
});

describe('createLinearSpineBuilder', () => {
  it('builds spine incrementally', () => {
    const builder = createLinearSpineBuilder(config);

    builder.add({ id: 'ch1', title: 'Chapter 1', order: 1 });
    builder.add({ id: 'ch2', title: 'Chapter 2', order: 2 });

    const spine = builder.build();
    expect(spine.length()).toBe(2);
  });

  it('supports addAll', () => {
    const builder = createLinearSpineBuilder(config);
    builder.addAll(testNodes);

    const spine = builder.build();
    expect(spine.length()).toBe(3);
  });

  it('supports chaining', () => {
    const spine = createLinearSpineBuilder(config)
      .add({ id: 'ch1', title: 'Chapter 1', order: 1 })
      .add({ id: 'ch2', title: 'Chapter 2', order: 2 })
      .build();

    expect(spine.length()).toBe(2);
  });
});
