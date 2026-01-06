/**
 * Spine interface - the core abstraction for ordered content structures.
 *
 * A spine represents a linear ordering of content nodes, such as:
 * - Chapters in a book
 * - Scenes in a screenplay
 * - Episodes in a series
 *
 * The spine provides navigation primitives for traversing and querying
 * the content structure.
 *
 * @typeParam Node - The type of nodes in the spine
 */
export interface Spine<Node> {
  /**
   * Get the root nodes of the spine (top-level entries).
   * For a single-root structure, this returns an array with one element.
   */
  roots(): Node[];

  /**
   * Get the children of a node.
   * Returns an empty array if the node has no children.
   */
  children(node: Node): Node[];

  /**
   * Get the parent of a node.
   * Returns null for root nodes.
   */
  parent(node: Node): Node | null;

  /**
   * Linearize the spine into a flat array in reading order.
   * This is a depth-first traversal that produces the canonical order.
   */
  linearize(): Node[];

  /**
   * Get the position of a node in the linearized spine.
   * Returns -1 if the node is not found.
   */
  position(node: Node): number;
}

/**
 * Extended spine interface for tree-structured content.
 *
 * Adds hierarchy-aware operations for navigating nested structures
 * like Book -> Arc -> Chapter -> Scene.
 *
 * @typeParam Node - The type of nodes in the spine
 */
export interface TreeSpine<Node> extends Spine<Node> {
  /**
   * Get the depth of a node in the tree.
   * Root nodes have depth 0.
   */
  depth(node: Node): number;

  /**
   * Get all ancestors of a node, from immediate parent to root.
   * Returns an empty array for root nodes.
   */
  ancestors(node: Node): Node[];

  /**
   * Get all descendants of a node (children, grandchildren, etc.).
   * Returns an empty array if the node has no children.
   */
  descendants(node: Node): Node[];
}

/**
 * Mutable spine interface for structures that can be modified.
 *
 * Extends the base Spine with mutation operations.
 *
 * @typeParam Node - The type of nodes in the spine
 */
export interface MutableSpine<Node> extends Spine<Node> {
  /**
   * Insert a node as a child of the parent at the given index.
   * If parent is null, inserts as a root node.
   */
  insert(node: Node, parent: Node | null, index: number): void;

  /**
   * Remove a node from the spine.
   * Throws if the node has children (must remove children first).
   */
  remove(node: Node): void;

  /**
   * Move a node to a new parent and index.
   */
  move(node: Node, newParent: Node | null, newIndex: number): void;
}
