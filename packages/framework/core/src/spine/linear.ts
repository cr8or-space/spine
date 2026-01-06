/**
 * Linear Spine Implementation - Flat ordered sequence of nodes.
 *
 * A linear spine has no hierarchy - all nodes are at the same level.
 * Think of it as a simple list with navigation and position tracking.
 */

import type { LinearSpine } from '@repo/framework-types';

/**
 * Configuration for creating a linear spine.
 */
export interface LinearSpineConfig<Node> {
  /** Function to get the unique ID of a node */
  getId: (node: Node) => string;
  /** Function to get the sort order of a node */
  getOrder: (node: Node) => number;
}

/**
 * Create a linear spine from a list of nodes.
 *
 * @param nodes - Array of nodes to include in the spine
 * @param config - Configuration for node identification and ordering
 */
export function createLinearSpine<Node>(
  nodes: Node[],
  config: LinearSpineConfig<Node>
): LinearSpine<Node> {
  // Sort nodes by order
  const sorted = [...nodes].sort((a, b) => config.getOrder(a) - config.getOrder(b));

  // Build ID to index map for fast lookups
  const idToIndex = new Map<string, number>();
  sorted.forEach((node, index) => {
    idToIndex.set(config.getId(node), index);
  });

  /**
   * Find node index by node reference.
   */
  function indexOf(node: Node): number {
    const id = config.getId(node);
    return idToIndex.get(id) ?? -1;
  }

  const spine: LinearSpine<Node> = {
    // Base Spine methods
    roots(): Node[] {
      return sorted.length > 0 ? [sorted[0]] : [];
    },

    children(): Node[] {
      // Linear spine has no hierarchy
      return [];
    },

    parent(): Node | null {
      // Linear spine has no hierarchy
      return null;
    },

    linearize(): Node[] {
      return [...sorted];
    },

    position(node: Node): number {
      return indexOf(node);
    },

    // LinearSpine methods
    first(): Node | null {
      return sorted[0] ?? null;
    },

    last(): Node | null {
      return sorted[sorted.length - 1] ?? null;
    },

    next(node: Node): Node | null {
      const index = indexOf(node);
      if (index === -1 || index >= sorted.length - 1) {
        return null;
      }
      return sorted[index + 1];
    },

    previous(node: Node): Node | null {
      const index = indexOf(node);
      if (index <= 0) {
        return null;
      }
      return sorted[index - 1];
    },

    at(index: number): Node | null {
      if (index < 0 || index >= sorted.length) {
        return null;
      }
      return sorted[index];
    },

    length(): number {
      return sorted.length;
    },
  };

  return spine;
}

/**
 * Create an empty linear spine.
 */
export function createEmptyLinearSpine<Node>(config: LinearSpineConfig<Node>): LinearSpine<Node> {
  return createLinearSpine([], config);
}

/**
 * Linear spine builder for incremental construction.
 */
export interface LinearSpineBuilder<Node> {
  /** Add a node to the spine */
  add(node: Node): LinearSpineBuilder<Node>;
  /** Add multiple nodes to the spine */
  addAll(nodes: Node[]): LinearSpineBuilder<Node>;
  /** Build the spine */
  build(): LinearSpine<Node>;
}

/**
 * Create a linear spine builder.
 *
 * @param config - Configuration for node identification and ordering
 */
export function createLinearSpineBuilder<Node>(
  config: LinearSpineConfig<Node>
): LinearSpineBuilder<Node> {
  const nodes: Node[] = [];

  const builder: LinearSpineBuilder<Node> = {
    add(node: Node): LinearSpineBuilder<Node> {
      nodes.push(node);
      return builder;
    },

    addAll(newNodes: Node[]): LinearSpineBuilder<Node> {
      nodes.push(...newNodes);
      return builder;
    },

    build(): LinearSpine<Node> {
      return createLinearSpine(nodes, config);
    },
  };

  return builder;
}
