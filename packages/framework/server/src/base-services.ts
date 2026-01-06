/**
 * Base Services Factory
 *
 * Creates the foundational services that all domains need.
 * Domains extend this with their specific services.
 */

import fs from 'node:fs';
import path from 'node:path';
import type Database from 'libsql';

import {
  openDatabase,
  createEntityRepository,
  createContentRepository,
  createValidationResultsRepository,
  type DatabaseConnection,
  type EntityRepository,
  type ContentRepository,
  type ValidationResultsRepository,
} from '@repo/framework-core';
import { createLLMClient, type LLMClient, type LLMConfig } from '@repo/framework-llm';

import type { BaseServices } from './types';

/**
 * Configuration for base services.
 */
export interface BaseServicesConfig {
  /** Directory for data files */
  dataDir: string;

  /** Override database path (default: dataDir/spine.db) */
  dbPath?: string;

  /** LLM configuration (optional) */
  llm?: LLMConfig;
}

/**
 * Internal state for base services.
 */
export interface BaseServicesState {
  dbConnection: DatabaseConnection;
  db: Database.Database;
  entities: EntityRepository;
  content: ContentRepository;
  validationResults: ValidationResultsRepository;
  llmClient?: LLMClient;
}

/**
 * Create base services that all domains need.
 *
 * @param config - Service configuration
 * @returns Base services instance
 *
 * @example
 * ```typescript
 * const baseServices = createBaseServices({
 *   dataDir: './data',
 *   llm: { endpoint: 'http://localhost:11434', defaultModel: 'llama3' }
 * });
 *
 * // Extend with domain services
 * const services = {
 *   ...baseServices,
 *   bible: createBibleService(baseServices.db),
 *   structure: createStructureService(baseServices.db),
 * };
 * ```
 */
export function createBaseServices(config: BaseServicesConfig): BaseServices {
  // Ensure data directory exists
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }

  // Open database
  const dbPath = config.dbPath || path.join(config.dataDir, 'spine.db');
  const dbConnection = openDatabase({ path: dbPath });
  dbConnection.initialize();

  const db = dbConnection.db;

  // Create framework repositories
  const entities = createEntityRepository(db);
  const content = createContentRepository(db);
  const validationResults = createValidationResultsRepository(db);

  // Create LLM client if configured
  let llmClient: LLMClient | undefined;
  if (config.llm) {
    llmClient = createLLMClient(config.llm);
  }

  return {
    db,
    entities,
    content,
    validationResults,
    llmClient,

    close(): void {
      db.close();
    },
  };
}

/**
 * Extend base services with domain-specific services.
 *
 * Helper function to combine base services with domain services.
 *
 * @param baseServices - Base services instance
 * @param domainServices - Domain-specific services to add
 * @returns Combined services object
 *
 * @example
 * ```typescript
 * const services = extendServices(baseServices, {
 *   bible: createBibleService(baseServices.db),
 *   structure: createStructureService(baseServices.db),
 * });
 * ```
 */
export function extendServices<TBase extends BaseServices, TDomain extends object>(
  baseServices: TBase,
  domainServices: TDomain
): TBase & TDomain {
  return {
    ...baseServices,
    ...domainServices,
  };
}
