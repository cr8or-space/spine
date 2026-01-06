/**
 * Framework Server Types
 *
 * Core type definitions for the WebSocket server infrastructure.
 * Domains extend these types for their specific needs.
 */

import type Database from 'libsql';
import type { ZodSchema } from 'zod';

import type { BaseContent, BaseEntity, ValidationResult, ValidatorRegistry } from '@repo/framework-types';
import type { EntityRepository, ContentRepository, ValidationResultsRepository } from '@repo/framework-core';
import type { LLMClient } from '@repo/framework-llm';

import type { ConnectionState } from './connection';
import type { Router } from './router';
import type { SubscriptionManager } from './subscriptions';

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Context passed to handlers with connection and request info.
 */
export interface HandlerContext {
  connection: ConnectionState;
  request: BaseRequest;
}

/**
 * Handler function signature.
 */
export type Handler<TParams = unknown, TResult = unknown> = (
  params: TParams,
  context: HandlerContext
) => Promise<TResult> | TResult;

/**
 * Handler definition with optional schema.
 */
export interface HandlerDefinition<TParams = unknown, TResult = unknown> {
  method: string;
  handler: Handler<TParams, TResult>;
  paramsSchema?: ZodSchema<TParams>;
  resultSchema?: ZodSchema<TResult>;
  description?: string;
}

/**
 * Base request structure for JSON-RPC.
 */
export interface BaseRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: unknown;
}

// ============================================================================
// Domain Registration
// ============================================================================

/**
 * Interface for domain handler registration.
 *
 * Domains implement this to register their handlers with the framework server.
 *
 * @example
 * ```typescript
 * const serialDomain: DomainHandlerRegistry<SerialServices> = {
 *   name: 'serial',
 *   registerHandlers(router, services, subscriptions) {
 *     registerBibleHandlers(router, services);
 *     registerStructureHandlers(router, services);
 *     // ...
 *   }
 * };
 * ```
 */
export interface DomainHandlerRegistry<TServices extends BaseServices = BaseServices> {
  /** Domain name for logging and method prefixes */
  name: string;

  /**
   * Register all handlers for this domain.
   */
  registerHandlers(
    router: Router,
    services: TServices,
    subscriptions: SubscriptionManager
  ): void;
}

// ============================================================================
// Services Types
// ============================================================================

/**
 * Base services interface that all domains must provide.
 *
 * Framework handlers depend on these base services.
 * Domains extend this with domain-specific services.
 */
export interface BaseServices {
  /** SQLite database connection */
  db: Database.Database;

  /** Entity repository */
  entities: EntityRepository;

  /** Content repository */
  content: ContentRepository;

  /** Validation results repository */
  validationResults: ValidationResultsRepository;

  /** LLM client (optional) */
  llmClient?: LLMClient;

  /** Close all resources */
  close(): void;
}

/**
 * Project service interface for generic project operations.
 */
export interface ProjectService<TProject = BaseProject, TMetadata = Record<string, unknown>> {
  /** List all projects */
  list(): TProject[];

  /** Get a project by ID */
  get(id: string): TProject | undefined;

  /** Create a new project */
  create(data: Omit<TProject, 'id' | 'createdAt' | 'updatedAt'>): TProject;

  /** Update a project */
  update(id: string, updates: Partial<TProject>): TProject | undefined;

  /** Update project metadata */
  updateMetadata(id: string, metadata: TMetadata): TProject | undefined;

  /** Delete a project */
  delete(id: string): boolean;
}

/**
 * Base project type that all domains extend.
 */
export interface BaseProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation context that domains provide.
 */
export interface ValidationContext {
  projectId: string;
  entities: BaseEntity[];
  content: BaseContent[];
}

/**
 * Validation service interface.
 */
export interface ValidationService<TContext extends ValidationContext = ValidationContext> {
  /** Run all validators */
  validate(context: TContext): Promise<ValidationResult[]>;

  /** Run validators for a specific phase */
  validatePhase(
    phase: 'structural' | 'automated' | 'computed',
    context: TContext
  ): Promise<ValidationResult[]>;

  /** Get the validator registry */
  getRegistry(): ValidatorRegistry<TContext>;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session state that persists across requests for a connection.
 *
 * Domains can extend this with additional session fields.
 */
export interface SessionState {
  /** Currently loaded project ID */
  currentProjectId?: string;

  /** Currently selected structure/spine node ID */
  currentStructureId?: string;

  /** Domain-specific session data */
  data: Record<string, unknown>;
}

/**
 * Session manager for accessing and updating session state.
 */
export interface SessionManager {
  /** Get session state for a connection */
  getSession(connectionId: string): SessionState;

  /** Update session state for a connection */
  updateSession(connectionId: string, updates: Partial<SessionState>): void;

  /** Clear session state for a connection */
  clearSession(connectionId: string): void;
}
