/**
 * Relationship graph service for bible management
 *
 * Provides graph operations across bible entities including
 * relationship traversal, path finding, and connectivity analysis.
 */

import type { EntityRef } from '@repo/types';

import type { CharacterService } from './character-service';
import type { FactionService } from './faction-service';
import type { LocationService } from './location-service';
import type { PlotThreadService } from './plot-thread-service';
import type { TimelineService } from './timeline-service';

/**
 * A graph node representing any bible entity
 */
export interface GraphNode {
  id: string;
  type: EntityRef['type'];
  name: string;
  connections: GraphEdge[];
}

/**
 * A graph edge representing a relationship between entities
 */
export interface GraphEdge {
  targetId: string;
  targetType: EntityRef['type'];
  relationshipType: string;
  label?: string;
  strength?: number;
  bidirectional: boolean;
}

/**
 * Path between two nodes in the relationship graph
 */
export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  length: number;
}

/**
 * Relationship graph service interface
 */
export interface RelationshipGraphService {
  /** Get all nodes in the graph */
  getAllNodes(): GraphNode[];

  /** Get a specific node */
  getNode(id: string, type: EntityRef['type']): GraphNode | undefined;

  /** Get all edges from a node */
  getEdges(id: string, type: EntityRef['type']): GraphEdge[];

  /** Get all nodes connected to a given node */
  getConnectedNodes(id: string, type: EntityRef['type']): GraphNode[];

  /** Get all nodes of a specific type connected to a node */
  getConnectedNodesOfType(
    id: string,
    type: EntityRef['type'],
    targetType: EntityRef['type']
  ): GraphNode[];

  /** Find shortest path between two nodes */
  findPath(
    fromId: string,
    fromType: EntityRef['type'],
    toId: string,
    toType: EntityRef['type']
  ): GraphPath | undefined;

  /** Find all paths between two nodes (up to a max depth) */
  findAllPaths(
    fromId: string,
    fromType: EntityRef['type'],
    toId: string,
    toType: EntityRef['type'],
    maxDepth?: number
  ): GraphPath[];

  /** Get the degree (number of connections) of a node */
  getDegree(id: string, type: EntityRef['type']): number;

  /** Find nodes with the most connections */
  getMostConnected(limit?: number): GraphNode[];

  /** Find isolated nodes (no connections) */
  getIsolatedNodes(): GraphNode[];

  /** Get all nodes within N hops of a starting node */
  getNeighborhood(id: string, type: EntityRef['type'], hops?: number): GraphNode[];

  /** Check if two nodes are connected (directly or indirectly) */
  areConnected(
    id1: string,
    type1: EntityRef['type'],
    id2: string,
    type2: EntityRef['type']
  ): boolean;

  /** Get clusters of connected nodes */
  getClusters(): GraphNode[][];

  /** Get subgraph containing only specific entity types */
  getSubgraph(types: EntityRef['type'][]): GraphNode[];
}

/**
 * Create relationship graph service
 */
export function createRelationshipGraphService(
  characterService: CharacterService,
  locationService: LocationService,
  factionService: FactionService,
  plotThreadService: PlotThreadService,
  timelineService: TimelineService
): RelationshipGraphService {
  /**
   * Build the complete graph from all services
   */
  function buildGraph(): Map<string, GraphNode> {
    const nodes = new Map<string, GraphNode>();

    // Add characters
    for (const char of characterService.getAll()) {
      const node: GraphNode = {
        id: char.id,
        type: 'character',
        name: char.name,
        connections: [],
      };

      // Add character relationships
      for (const rel of char.relationships) {
        node.connections.push({
          targetId: rel.targetId,
          targetType: 'character',
          relationshipType: rel.type,
          label: rel.description,
          strength: rel.intensity,
          bidirectional: rel.mutual,
        });
      }

      nodes.set(`character:${char.id}`, node);
    }

    // Add locations
    for (const loc of locationService.getAll()) {
      const node: GraphNode = {
        id: loc.id,
        type: 'location',
        name: loc.name,
        connections: [],
      };

      // Parent-child relationships
      if (loc.parentId) {
        node.connections.push({
          targetId: loc.parentId,
          targetType: 'location',
          relationshipType: 'part-of',
          bidirectional: false,
        });
      }

      // Location relations
      for (const rel of loc.relations) {
        node.connections.push({
          targetId: rel.targetId,
          targetType: 'location',
          relationshipType: rel.type,
          label: rel.description,
          bidirectional: rel.type === 'adjacent' || rel.type === 'connected',
        });
      }

      // Associated characters
      for (const charId of loc.associatedCharacters) {
        node.connections.push({
          targetId: charId,
          targetType: 'character',
          relationshipType: 'associated',
          bidirectional: true,
        });
      }

      nodes.set(`location:${loc.id}`, node);
    }

    // Add factions
    for (const faction of factionService.getAll()) {
      const node: GraphNode = {
        id: faction.id,
        type: 'faction',
        name: faction.name,
        connections: [],
      };

      // Members
      for (const member of faction.members) {
        node.connections.push({
          targetId: member.characterId,
          targetType: 'character',
          relationshipType: 'member',
          label: member.rank,
          bidirectional: true,
        });
      }

      // Faction relations
      for (const rel of faction.relations) {
        node.connections.push({
          targetId: rel.targetId,
          targetType: 'faction',
          relationshipType: rel.type,
          label: rel.description,
          bidirectional: true,
        });
      }

      // Faction locations
      for (const locId of faction.locations) {
        node.connections.push({
          targetId: locId,
          targetType: 'location',
          relationshipType: 'controls',
          bidirectional: true,
        });
      }

      nodes.set(`faction:${faction.id}`, node);
    }

    // Add plot threads
    for (const thread of plotThreadService.getAll()) {
      const node: GraphNode = {
        id: thread.id,
        type: 'plot-thread',
        name: thread.name,
        connections: [],
      };

      // Involved characters
      for (const charId of thread.involvedCharacters) {
        node.connections.push({
          targetId: charId,
          targetType: 'character',
          relationshipType: 'involves',
          bidirectional: true,
        });
      }

      // Related locations
      for (const locId of thread.relatedLocations) {
        node.connections.push({
          targetId: locId,
          targetType: 'location',
          relationshipType: 'relates-to',
          bidirectional: true,
        });
      }

      // Parent thread
      if (thread.parentThreadId) {
        node.connections.push({
          targetId: thread.parentThreadId,
          targetType: 'plot-thread',
          relationshipType: 'sub-thread',
          bidirectional: false,
        });
      }

      nodes.set(`plot-thread:${thread.id}`, node);
    }

    // Add timeline events
    for (const event of timelineService.getAllEvents()) {
      const node: GraphNode = {
        id: event.id,
        type: 'timeline-event',
        name: event.name,
        connections: [],
      };

      // Involved characters
      for (const charId of event.involvedCharacters) {
        node.connections.push({
          targetId: charId,
          targetType: 'character',
          relationshipType: 'involves',
          bidirectional: true,
        });
      }

      // Locations
      for (const locId of event.locations) {
        node.connections.push({
          targetId: locId,
          targetType: 'location',
          relationshipType: 'occurs-at',
          bidirectional: true,
        });
      }

      // Related threads
      for (const threadId of event.relatedThreads) {
        node.connections.push({
          targetId: threadId,
          targetType: 'plot-thread',
          relationshipType: 'relates-to',
          bidirectional: true,
        });
      }

      // Causal links
      for (const cause of event.causes) {
        node.connections.push({
          targetId: cause.causeEventId,
          targetType: 'timeline-event',
          relationshipType: `caused-by:${cause.type}`,
          bidirectional: false,
        });
      }

      // Effects
      for (const effectId of event.effects) {
        node.connections.push({
          targetId: effectId,
          targetType: 'timeline-event',
          relationshipType: 'causes',
          bidirectional: false,
        });
      }

      nodes.set(`timeline-event:${event.id}`, node);
    }

    return nodes;
  }

  function nodeKey(id: string, type: EntityRef['type']): string {
    return `${type}:${id}`;
  }

  return {
    getAllNodes(): GraphNode[] {
      const graph = buildGraph();
      return Array.from(graph.values());
    },

    getNode(id: string, type: EntityRef['type']): GraphNode | undefined {
      const graph = buildGraph();
      return graph.get(nodeKey(id, type));
    },

    getEdges(id: string, type: EntityRef['type']): GraphEdge[] {
      const node = this.getNode(id, type);
      return node?.connections ?? [];
    },

    getConnectedNodes(id: string, type: EntityRef['type']): GraphNode[] {
      const edges = this.getEdges(id, type);
      const graph = buildGraph();

      return edges
        .map((e) => graph.get(nodeKey(e.targetId, e.targetType)))
        .filter((n): n is GraphNode => n !== undefined);
    },

    getConnectedNodesOfType(
      id: string,
      type: EntityRef['type'],
      targetType: EntityRef['type']
    ): GraphNode[] {
      return this.getConnectedNodes(id, type).filter((n) => n.type === targetType);
    },

    findPath(
      fromId: string,
      fromType: EntityRef['type'],
      toId: string,
      toType: EntityRef['type']
    ): GraphPath | undefined {
      const graph = buildGraph();
      const startKey = nodeKey(fromId, fromType);
      const endKey = nodeKey(toId, toType);

      if (!graph.has(startKey) || !graph.has(endKey)) {
        return undefined;
      }

      // BFS for shortest path
      const visited = new Set<string>();
      const queue: Array<{ key: string; path: string[]; edges: GraphEdge[] }> = [
        { key: startKey, path: [startKey], edges: [] },
      ];

      while (queue.length > 0) {
        const { key, path, edges } = queue.shift()!;

        if (key === endKey) {
          const nodes = path
            .map((k) => graph.get(k))
            .filter((n): n is GraphNode => n !== undefined);
          return { nodes, edges, length: edges.length };
        }

        if (visited.has(key)) continue;
        visited.add(key);

        const node = graph.get(key);
        if (!node) continue;

        for (const edge of node.connections) {
          const targetKey = nodeKey(edge.targetId, edge.targetType);
          if (!visited.has(targetKey)) {
            queue.push({
              key: targetKey,
              path: [...path, targetKey],
              edges: [...edges, edge],
            });
          }
        }

        // Also check reverse edges for bidirectional connections
        for (const [otherKey, otherNode] of graph.entries()) {
          if (visited.has(otherKey)) continue;
          for (const edge of otherNode.connections) {
            if (
              nodeKey(edge.targetId, edge.targetType) === key &&
              edge.bidirectional
            ) {
              queue.push({
                key: otherKey,
                path: [...path, otherKey],
                edges: [...edges, { ...edge, targetId: otherNode.id, targetType: otherNode.type }],
              });
            }
          }
        }
      }

      return undefined;
    },

    findAllPaths(
      fromId: string,
      fromType: EntityRef['type'],
      toId: string,
      toType: EntityRef['type'],
      maxDepth = 5
    ): GraphPath[] {
      const graph = buildGraph();
      const startKey = nodeKey(fromId, fromType);
      const endKey = nodeKey(toId, toType);

      if (!graph.has(startKey) || !graph.has(endKey)) {
        return [];
      }

      const allPaths: GraphPath[] = [];

      const dfs = (key: string, path: string[], edges: GraphEdge[], visited: Set<string>) => {
        if (path.length > maxDepth + 1) return;

        if (key === endKey) {
          const nodes = path
            .map((k) => graph.get(k))
            .filter((n): n is GraphNode => n !== undefined);
          allPaths.push({ nodes, edges: [...edges], length: edges.length });
          return;
        }

        const node = graph.get(key);
        if (!node) return;

        for (const edge of node.connections) {
          const targetKey = nodeKey(edge.targetId, edge.targetType);
          if (!visited.has(targetKey)) {
            visited.add(targetKey);
            dfs(targetKey, [...path, targetKey], [...edges, edge], visited);
            visited.delete(targetKey);
          }
        }
      };

      const visited = new Set<string>([startKey]);
      dfs(startKey, [startKey], [], visited);

      return allPaths;
    },

    getDegree(id: string, type: EntityRef['type']): number {
      const graph = buildGraph();
      const key = nodeKey(id, type);
      const node = graph.get(key);

      if (!node) return 0;

      let degree = node.connections.length;

      // Count incoming edges from other nodes
      for (const otherNode of graph.values()) {
        if (otherNode.id === id && otherNode.type === type) continue;
        for (const edge of otherNode.connections) {
          if (edge.targetId === id && edge.targetType === type) {
            degree++;
          }
        }
      }

      return degree;
    },

    getMostConnected(limit = 10): GraphNode[] {
      const nodes = this.getAllNodes();
      const withDegrees = nodes.map((n) => ({
        node: n,
        degree: this.getDegree(n.id, n.type),
      }));

      withDegrees.sort((a, b) => b.degree - a.degree);

      return withDegrees.slice(0, limit).map((d) => d.node);
    },

    getIsolatedNodes(): GraphNode[] {
      return this.getAllNodes().filter((n) => this.getDegree(n.id, n.type) === 0);
    },

    getNeighborhood(id: string, type: EntityRef['type'], hops = 2): GraphNode[] {
      const graph = buildGraph();
      const startKey = nodeKey(id, type);

      if (!graph.has(startKey)) return [];

      const visited = new Set<string>();
      let frontier = new Set<string>([startKey]);

      for (let i = 0; i < hops; i++) {
        const nextFrontier = new Set<string>();

        for (const key of frontier) {
          if (visited.has(key)) continue;
          visited.add(key);

          const node = graph.get(key);
          if (!node) continue;

          for (const edge of node.connections) {
            const targetKey = nodeKey(edge.targetId, edge.targetType);
            if (!visited.has(targetKey)) {
              nextFrontier.add(targetKey);
            }
          }

          // Check incoming edges
          for (const [otherKey, otherNode] of graph.entries()) {
            if (visited.has(otherKey)) continue;
            for (const edge of otherNode.connections) {
              if (nodeKey(edge.targetId, edge.targetType) === key && edge.bidirectional) {
                nextFrontier.add(otherKey);
              }
            }
          }
        }

        frontier = nextFrontier;
      }

      // Add final frontier to visited
      for (const key of frontier) {
        visited.add(key);
      }

      return Array.from(visited)
        .map((k) => graph.get(k))
        .filter((n): n is GraphNode => n !== undefined);
    },

    areConnected(
      id1: string,
      type1: EntityRef['type'],
      id2: string,
      type2: EntityRef['type']
    ): boolean {
      return this.findPath(id1, type1, id2, type2) !== undefined;
    },

    getClusters(): GraphNode[][] {
      const graph = buildGraph();
      const visited = new Set<string>();
      const clusters: GraphNode[][] = [];

      for (const [key] of graph) {
        if (visited.has(key)) continue;

        // BFS to find all connected nodes
        const cluster: GraphNode[] = [];
        const queue = [key];

        while (queue.length > 0) {
          const currentKey = queue.shift()!;
          if (visited.has(currentKey)) continue;
          visited.add(currentKey);

          const node = graph.get(currentKey);
          if (node) {
            cluster.push(node);

            for (const edge of node.connections) {
              const targetKey = nodeKey(edge.targetId, edge.targetType);
              if (!visited.has(targetKey)) {
                queue.push(targetKey);
              }
            }

            // Check incoming edges
            for (const [otherKey, otherNode] of graph.entries()) {
              if (visited.has(otherKey)) continue;
              for (const edge of otherNode.connections) {
                if (nodeKey(edge.targetId, edge.targetType) === currentKey) {
                  queue.push(otherKey);
                }
              }
            }
          }
        }

        if (cluster.length > 0) {
          clusters.push(cluster);
        }
      }

      return clusters;
    },

    getSubgraph(types: EntityRef['type'][]): GraphNode[] {
      return this.getAllNodes().filter((n) => types.includes(n.type));
    },
  };
}
