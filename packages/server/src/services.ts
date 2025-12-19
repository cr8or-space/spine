/**
 * Service context for WebSocket handlers.
 *
 * Initializes and manages all domain services that handlers need to access.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  openDatabase,
  createProjectService,
  type ProjectService,
  type DrizzleDB,
  createBibleService,
  type BibleService,
  createStructureService,
  type StructureService,
  createVersionService,
  type VersionService
} from '@repo/core';
import { createLLMClient, type LLMClient } from '@repo/llm';
import type Database from 'libsql';

export interface ServiceConfig {
  dataDir: string;
  dbPath?: string;
  llm?: {
    endpoint: string;
    apiKey?: string;
    defaultModel: string;
  };
}

export interface Services {
  db: Database.Database;
  drizzle: DrizzleDB;
  project: ProjectService;
  bible(projectId: string): BibleService;
  structure(projectId: string): StructureService;
  version: VersionService;
  llmClient: LLMClient | undefined;
  close(): void;
}

/**
 * Create the services context for the server.
 */
export function createServices(config: ServiceConfig): Services {
  // Ensure data directory exists
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }

  // Open database
  const dbPath = config.dbPath || path.join(config.dataDir, 'spine.db');
  const dbConnection = openDatabase({ path: dbPath });
  dbConnection.initialize();

  const db = dbConnection.db;
  const drizzle = dbConnection.drizzle;

  // Create core project service
  const projectService = createProjectService(db, drizzle);

  // Create LLM client if configured
  let llmClient: LLMClient | undefined;
  if (config.llm) {
    llmClient = createLLMClient({
      endpoint: config.llm.endpoint,
      apiKey: config.llm.apiKey,
      defaultModel: config.llm.defaultModel
    });
  }

  // Create version service (shared across all projects)
  const versionService = createVersionService();

  // Service factory functions
  function getBibleService(projectId: string): BibleService {
    return createBibleService(db, drizzle, projectId);
  }

  function getStructureService(projectId: string): StructureService {
    return createStructureService(projectId, projectService.repos.structures);
  }

  return {
    db,
    drizzle,
    project: projectService,
    bible: getBibleService,
    structure: getStructureService,
    version: versionService,
    llmClient,

    close(): void {
      db.close();
    }
  };
}
