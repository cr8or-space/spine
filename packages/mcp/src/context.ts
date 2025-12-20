/**
 * Session context management
 *
 * Maintains state across tool calls to avoid requiring
 * projectId on every request.
 */

export interface SessionContext {
  /** Currently loaded project ID */
  currentProjectId: string | null;
  /** Currently selected structure ID */
  currentStructureId: string | null;
  /** Current project title (for display) */
  currentProjectTitle: string | null;
}

/**
 * Create a new session context
 */
export function createSessionContext(): SessionContext {
  return {
    currentProjectId: null,
    currentStructureId: null,
    currentProjectTitle: null
  };
}

/**
 * Check if a project is loaded
 */
export function hasProject(context: SessionContext): boolean {
  return context.currentProjectId !== null;
}

/**
 * Get project ID, throwing if not loaded
 */
export function requireProjectId(context: SessionContext): string {
  if (!context.currentProjectId) {
    throw new Error(
      'No project loaded. Use spine_project_load to load a project first.'
    );
  }
  return context.currentProjectId;
}

/**
 * Get structure ID, throwing if not selected
 */
export function requireStructureId(context: SessionContext): string {
  if (!context.currentStructureId) {
    throw new Error(
      'No structure selected. Use spine_structure_select to select a structure first.'
    );
  }
  return context.currentStructureId;
}

/**
 * Load a project into context
 */
export function loadProject(
  context: SessionContext,
  projectId: string,
  projectTitle: string
): void {
  context.currentProjectId = projectId;
  context.currentProjectTitle = projectTitle;
  context.currentStructureId = null;
}

/**
 * Select a structure in context
 */
export function selectStructure(
  context: SessionContext,
  structureId: string
): void {
  context.currentStructureId = structureId;
}

/**
 * Clear the session context
 */
export function clearContext(context: SessionContext): void {
  context.currentProjectId = null;
  context.currentProjectTitle = null;
  context.currentStructureId = null;
}
