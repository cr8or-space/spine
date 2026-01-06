/**
 * Session Manager
 *
 * Manages per-connection session state that persists across requests.
 * Domains can store arbitrary data in the session.
 */

import type { SessionState, SessionManager } from './types';

// Re-export SessionManager from types so framework.ts can import it from session
export type { SessionManager } from './types';

/**
 * Create a session manager.
 *
 * Sessions are keyed by connection ID and automatically cleaned up
 * when connections are removed.
 */
export function createSessionManager(): SessionManager {
  const sessions = new Map<string, SessionState>();

  /**
   * Create a new session state.
   */
  function createSession(): SessionState {
    return {
      currentProjectId: undefined,
      currentStructureId: undefined,
      data: {},
    };
  }

  return {
    getSession(connectionId: string): SessionState {
      let session = sessions.get(connectionId);
      if (!session) {
        session = createSession();
        sessions.set(connectionId, session);
      }
      return session;
    },

    updateSession(connectionId: string, updates: Partial<SessionState>): void {
      const session = this.getSession(connectionId);

      if (updates.currentProjectId !== undefined) {
        session.currentProjectId = updates.currentProjectId;
      }
      if (updates.currentStructureId !== undefined) {
        session.currentStructureId = updates.currentStructureId;
      }
      if (updates.data !== undefined) {
        session.data = { ...session.data, ...updates.data };
      }
    },

    clearSession(connectionId: string): void {
      sessions.delete(connectionId);
    },
  };
}

/**
 * Session-aware handler context.
 *
 * Adds session state to the standard handler context.
 */
export interface SessionContext {
  /** Current session state */
  session: SessionState;

  /** Update session state */
  updateSession(updates: Partial<SessionState>): void;

  /** Set the current project */
  setCurrentProject(projectId: string | undefined): void;

  /** Set the current structure/spine node */
  setCurrentStructure(structureId: string | undefined): void;

  /** Get or throw if no project is loaded */
  requireProject(): string;

  /** Get domain-specific session data */
  getData<T>(key: string): T | undefined;

  /** Set domain-specific session data */
  setData<T>(key: string, value: T): void;
}

/**
 * Create a session context for a connection.
 *
 * Wraps the session manager with a connection-specific interface.
 */
export function createSessionContext(
  sessionManager: SessionManager,
  connectionId: string
): SessionContext {
  const session = sessionManager.getSession(connectionId);

  return {
    session,

    updateSession(updates: Partial<SessionState>): void {
      sessionManager.updateSession(connectionId, updates);
    },

    setCurrentProject(projectId: string | undefined): void {
      // Clear structure when switching projects
      if (projectId !== session.currentProjectId) {
        session.currentStructureId = undefined;
      }
      session.currentProjectId = projectId;
    },

    setCurrentStructure(structureId: string | undefined): void {
      session.currentStructureId = structureId;
    },

    requireProject(): string {
      if (!session.currentProjectId) {
        // This will be caught by the router and converted to a proper API error
        // Using a generic Error as this module shouldn't depend on router
        throw new Error('No project loaded. Use project.load first.');
      }
      return session.currentProjectId;
    },

    getData<T>(key: string): T | undefined {
      return session.data[key] as T | undefined;
    },

    setData<T>(key: string, value: T): void {
      session.data[key] = value;
    },
  };
}
