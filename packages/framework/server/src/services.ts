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
  type VersionService,
  createGenerationPipeline,
  type GenerationPipeline,
  createReviewWorkflowService,
  type ReviewWorkflowService,
  createAnalysisService,
  type AnalysisService,
  createRevisionCascadeService,
  type RevisionCascadeService,
  createLockPointRepository,
  type LockPointRepository,
  createErrorHandlingService,
  type ErrorHandlingService,
  createExtractionService,
  type ExtractionService
} from '@repo/serial-core';
import { createLLMClient, type LLMClient } from '@repo/framework-llm';
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
  review(projectId: string): ReviewWorkflowService;
  cascade: RevisionCascadeService;
  generation: GenerationPipeline | undefined;
  analysis: AnalysisService | undefined;
  extraction: ExtractionService | undefined;
  llmClient: LLMClient | undefined;
  errorHandling: ErrorHandlingService;
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

  // Create lock point repository (not included in project service)
  const lockPointRepo: LockPointRepository = createLockPointRepository(db, drizzle);

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

  // Create generation pipeline (requires LLM client)
  const generationPipeline = llmClient ? createGenerationPipeline(llmClient) : undefined;

  // Create analysis service (requires LLM client)
  const analysisService = llmClient ? createAnalysisService(llmClient) : undefined;

  // Create extraction service (requires LLM client)
  const extractionService = llmClient
    ? createExtractionService({ db, llm: llmClient })
    : undefined;

  // Service factory functions
  function getBibleService(projectId: string): BibleService {
    return createBibleService(db, drizzle, projectId);
  }

  function getStructureService(projectId: string): StructureService {
    return createStructureService(projectId, projectService.repos.structures);
  }

  function getReviewService(_projectId: string): ReviewWorkflowService {
    // Note: projectId is used by the caller to scope method calls, not for service creation
    return createReviewWorkflowService(
      projectService.repos.contents,
      lockPointRepo,
      projectService.repos.structures
    );
  }

  // Create cascade service (shared across all projects)
  const cascadeService = createRevisionCascadeService(
    projectService.repos.contents,
    lockPointRepo,
    projectService.repos.structures
  );

  // Create error handling service
  const backupDir = path.join(config.dataDir, 'backups');
  const errorHandlingService = createErrorHandlingService({
    db,
    backup: {
      backupDir,
      databasePath: dbPath,
    },
    cleanup: {
      operationJournalDays: 30,
      backupCount: 10,
    },
  });

  return {
    db,
    drizzle,
    project: projectService,
    bible: getBibleService,
    structure: getStructureService,
    version: versionService,
    review: getReviewService,
    cascade: cascadeService,
    generation: generationPipeline,
    analysis: analysisService,
    extraction: extractionService,
    llmClient,
    errorHandling: errorHandlingService,

    close(): void {
      db.close();
    }
  };
}
