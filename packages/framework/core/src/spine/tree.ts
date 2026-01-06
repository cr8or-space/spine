/**
 * Tree Spine Implementation - Hierarchical structure of nodes.
 *
 * A tree spine supports nested structures like:
 * - Book -> Arc -> Chapter -> Scene
 * - Part -> Chapter -> Section
 *
 * Provides hierarchy-aware navigation and traversal.
 */

import type { TreeSpine } from '@repo/framework-types';

/**
 * Configuration for creating a tree spine.
 */
export interface TreeSpineConfig<Node> {
  /** Function to get the unique ID of a node */
  getId: (node: Node) => string;
  /** Function to get the parent ID of a node (null for root nodes) */
  getParentId: (node: Node) => string | null;
  /** Function to get the sort order of a node within its parent */
  getOrder: (node: Node) => number;
}

/**
 * Internal node structure with computed relationships.
 */
interface TreeNode<Node> {
  node: Node;
  id: string;
  parentId: string | null;
  order: number;
  depth: number;
  children: TreeNode<Node>[];
}

/**
 * Create a tree spine from a list of nodes.
 *
 * @param nodes - Array of nodes to include in the spine
 * @param config - Configuration for node identification and hierarchy
 */
export function createTreeSpine<Node>(
  nodes: Node[],
  config: TreeSpineConfig<Node>
): TreeSpine<Node> {
  // Build internal tree structure
  const nodeMap = new Map<string, TreeNode<Node>>();
  const rootNodes: TreeNode<Node>[] = [];

  // First pass: create all tree nodes
  for (const node of nodes) {
    const id = config.getId(node);
    const parentId = config.getParentId(node);
    const order = config.getOrder(node);

    nodeMap.set(id, {
      node,
      id,
      parentId,
      order,
      depth: 0,
      children: [],
    });
  }

  // Second pass: build parent-child relationships and find roots
  for (const treeNode of nodeMap.values()) {
    if (treeNode.parentId === null) {
      rootNodes.push(treeNode);
    } else {
      const parent = nodeMap.get(treeNode.parentId);
      if (parent) {
        parent.children.push(treeNode);
      } else {
        // Parent not found, treat as root
        rootNodes.push(treeNode);
      }
    }
  }

  // Third pass: sort children and compute depths
  function sortAndComputeDepths(nodes: TreeNode<Node>[], depth: number): void {
    nodes.sort((a, b) => a.order - b.order);
    for (const node of nodes) {
      node.depth = depth;
      sortAndComputeDepths(node.children, depth + 1);
    }
  }
  sortAndComputeDepths(rootNodes, 0);

  // Build ID to tree node map for lookups
  function findTreeNode(node: Node): TreeNode<Node> | undefined {
    const id = config.getId(node);
    return nodeMap.get(id);
  }

  // Linearize the tree (depth-first traversal)
  function linearizeTree(nodes: TreeNode<Node>[]): Node[] {
    const result: Node[] = [];
    for (const treeNode of nodes) {
      result.push(treeNode.node);
      result.push(...linearizeTree(treeNode.children));
    }
    return result;
  }

  // Cache linearized form
  let linearized: Node[] | null = null;
  function getLinearized(): Node[] {
    if (linearized === null) {
      linearized = linearizeTree(rootNodes);
    }
    return linearized;
  }

  const spine: TreeSpine<Node> = {
    // Base Spine methods
    roots(): Node[] {
      return rootNodes.map((tn) => tn.node);
    },

    children(node: Node): Node[] {
      const treeNode = findTreeNode(node);
      if (!treeNode) return [];
      return treeNode.children.map((child) => child.node);
    },

    parent(node: Node): Node | null {
      const treeNode = findTreeNode(node);
      if (!treeNode || !treeNode.parentId) return null;
      const parentTreeNode = nodeMap.get(treeNode.parentId);
      return parentTreeNode?.node ?? null;
    },

    linearize(): Node[] {
      return [...getLinearized()];
    },

    position(node: Node): number {
      const linear = getLinearized();
      const id = config.getId(node);
      return linear.findIndex((n) => config.getId(n) === id);
    },

    // TreeSpine methods
    depth(node: Node): number {
      const treeNode = findTreeNode(node);
      return treeNode?.depth ?? -1;
    },

    ancestors(node: Node): Node[] {
      const result: Node[] = [];
      let current = this.parent(node);
      while (current !== null) {
        result.push(current);
        current = this.parent(current);
      }
      return result;
    },

    descendants(node: Node): Node[] {
      const treeNode = findTreeNode(node);
      if (!treeNode) return [];

      const result: Node[] = [];
      function collectDescendants(children: TreeNode<Node>[]): void {
        for (const child of children) {
          result.push(child.node);
          collectDescendants(child.children);
        }
      }
      collectDescendants(treeNode.children);
      return result;
    },
  };

  return spine;
}

/**
 * Create an empty tree spine.
 */
export function createEmptyTreeSpine<Node>(config: TreeSpineConfig<Node>): TreeSpine<Node> {
  return createTreeSpine([], config);
}

/**
 * Tree spine builder for incremental construction.
 */
export interface TreeSpineBuilder<Node> {
  /** Add a node to the spine */
  add(node: Node): TreeSpineBuilder<Node>;
  /** Add multiple nodes to the spine */
  addAll(nodes: Node[]): TreeSpineBuilder<Node>;
  /** Build the spine */
  build(): TreeSpine<Node>;
}

/**
 * Create a tree spine builder.
 *
 * @param config - Configuration for node identification and hierarchy
 */
export function createTreeSpineBuilder<Node>(config: TreeSpineConfig<Node>): TreeSpineBuilder<Node> {
  const nodes: Node[] = [];

  const builder: TreeSpineBuilder<Node> = {
    add(node: Node): TreeSpineBuilder<Node> {
      nodes.push(node);
      return builder;
    },

    addAll(newNodes: Node[]): TreeSpineBuilder<Node> {
      nodes.push(...newNodes);
      return builder;
    },

    build(): TreeSpine<Node> {
      return createTreeSpine(nodes, config);
    },
  };

  return builder;
}

/**
 * Find the path from root to a node.
 */
export function pathToRoot<Node>(spine: TreeSpine<Node>, node: Node): Node[] {
  const path = [node, ...spine.ancestors(node)];
  return path.reverse();
}

/**
 * Find the lowest common ancestor of two nodes.
 */
export function lowestCommonAncestor<Node>(
  spine: TreeSpine<Node>,
  nodeA: Node,
  nodeB: Node,
  getId: (node: Node) => string
): Node | null {
  const ancestorsA = new Set(spine.ancestors(nodeA).map(getId));
  ancestorsA.add(getId(nodeA));

  // Walk up from B, first match is LCA
  let current: Node | null = nodeB;
  while (current !== null) {
    if (ancestorsA.has(getId(current))) {
      return current;
    }
    current = spine.parent(current);
  }

  return null;
}

/**
 * Get all leaf nodes (nodes with no children).
 */
export function getLeafNodes<Node>(spine: TreeSpine<Node>): Node[] {
  return spine.linearize().filter((node) => spine.children(node).length === 0);
}

/**
 * Get nodes at a specific depth.
 */
export function getNodesAtDepth<Node>(spine: TreeSpine<Node>, targetDepth: number): Node[] {
  return spine.linearize().filter((node) => spine.depth(node) === targetDepth);
}
