/**
 * Server hooks - Initialize database and project service
 */

import { openDatabase, createProjectService, type ProjectService } from '@repo/core';
import type { Handle } from '@sveltejs/kit';
import path from 'path';
import fs from 'fs';

// Data directory for storing projects
const DATA_DIR = process.env.SPINE_DATA_DIR || path.join(process.cwd(), '.spine-data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database path
const DB_PATH = path.join(DATA_DIR, 'spine.db');

// Initialize database and project service (singleton)
const dbConnection = openDatabase({ path: DB_PATH });
dbConnection.initialize(); // Ensure schema is initialized
const projectService = createProjectService(dbConnection.db, dbConnection.drizzle);

// Make project service available to request handlers
declare global {
  var projectService: ProjectService;
}

globalThis.projectService = projectService;

export const handle: Handle = async ({ event, resolve }) => {
  // Add project service and database to locals for access in load functions
  event.locals.projectService = projectService;
  event.locals.db = dbConnection.db;
  event.locals.drizzle = dbConnection.drizzle;

  return resolve(event);
};
