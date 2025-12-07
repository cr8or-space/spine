/**
 * Server hooks - Initialize database and project service
 */

import { openDatabase, createProjectService, type ProjectService } from '@repo/core';
import type { Handle } from '@sveltejs/kit';
import path from 'path';
import fs from 'fs';

// Data directory for storing projects
const DATA_DIR = process.env.NOVELGEN_DATA_DIR || path.join(process.cwd(), '.novelgen-data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database path
const DB_PATH = path.join(DATA_DIR, 'novelgen.db');

// Initialize database and project service (singleton)
const db = openDatabase(DB_PATH);
const projectService = createProjectService(db);

// Make project service available to request handlers
declare global {
  // eslint-disable-next-line no-var
  var projectService: ProjectService;
}

globalThis.projectService = projectService;

export const handle: Handle = async ({ event, resolve }) => {
  // Add project service to locals for access in load functions
  event.locals.projectService = projectService;

  return resolve(event);
};
