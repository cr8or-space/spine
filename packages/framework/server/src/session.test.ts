/**
 * Session Manager Tests
 *
 * Tests for session management and session context.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSessionManager, createSessionContext } from './session';
import type { SessionManager } from './types';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = createSessionManager();
  });

  describe('getSession', () => {
    it('should create a new session for unknown connection', () => {
      const session = sessionManager.getSession('conn-1');

      expect(session).toBeDefined();
      expect(session.currentProjectId).toBeUndefined();
      expect(session.currentStructureId).toBeUndefined();
      expect(session.data).toEqual({});
    });

    it('should return the same session for the same connection', () => {
      const session1 = sessionManager.getSession('conn-1');
      session1.currentProjectId = 'proj-1';

      const session2 = sessionManager.getSession('conn-1');

      expect(session2.currentProjectId).toBe('proj-1');
      expect(session1).toBe(session2);
    });

    it('should return different sessions for different connections', () => {
      const session1 = sessionManager.getSession('conn-1');
      session1.currentProjectId = 'proj-1';

      const session2 = sessionManager.getSession('conn-2');

      expect(session2.currentProjectId).toBeUndefined();
      expect(session1).not.toBe(session2);
    });
  });

  describe('updateSession', () => {
    it('should update currentProjectId', () => {
      sessionManager.updateSession('conn-1', { currentProjectId: 'proj-1' });

      const session = sessionManager.getSession('conn-1');
      expect(session.currentProjectId).toBe('proj-1');
    });

    it('should update currentStructureId', () => {
      sessionManager.updateSession('conn-1', { currentStructureId: 'struct-1' });

      const session = sessionManager.getSession('conn-1');
      expect(session.currentStructureId).toBe('struct-1');
    });

    it('should merge data updates', () => {
      sessionManager.updateSession('conn-1', { data: { key1: 'value1' } });
      sessionManager.updateSession('conn-1', { data: { key2: 'value2' } });

      const session = sessionManager.getSession('conn-1');
      expect(session.data).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should create session if it does not exist', () => {
      sessionManager.updateSession('conn-new', { currentProjectId: 'proj-1' });

      const session = sessionManager.getSession('conn-new');
      expect(session.currentProjectId).toBe('proj-1');
    });
  });

  describe('clearSession', () => {
    it('should remove the session', () => {
      const session = sessionManager.getSession('conn-1');
      session.currentProjectId = 'proj-1';

      sessionManager.clearSession('conn-1');

      const newSession = sessionManager.getSession('conn-1');
      expect(newSession.currentProjectId).toBeUndefined();
    });

    it('should not throw for unknown connection', () => {
      expect(() => sessionManager.clearSession('unknown')).not.toThrow();
    });
  });
});

describe('SessionContext', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = createSessionManager();
  });

  describe('setCurrentProject', () => {
    it('should set the current project', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');

      ctx.setCurrentProject('proj-1');

      expect(ctx.session.currentProjectId).toBe('proj-1');
    });

    it('should clear structure when switching projects', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');
      ctx.setCurrentProject('proj-1');
      ctx.setCurrentStructure('struct-1');

      ctx.setCurrentProject('proj-2');

      expect(ctx.session.currentProjectId).toBe('proj-2');
      expect(ctx.session.currentStructureId).toBeUndefined();
    });

    it('should not clear structure when setting same project', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');
      ctx.setCurrentProject('proj-1');
      ctx.setCurrentStructure('struct-1');

      ctx.setCurrentProject('proj-1');

      expect(ctx.session.currentStructureId).toBe('struct-1');
    });

    it('should clear project when setting undefined', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');
      ctx.setCurrentProject('proj-1');

      ctx.setCurrentProject(undefined);

      expect(ctx.session.currentProjectId).toBeUndefined();
    });
  });

  describe('setCurrentStructure', () => {
    it('should set the current structure', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');

      ctx.setCurrentStructure('struct-1');

      expect(ctx.session.currentStructureId).toBe('struct-1');
    });

    it('should clear structure when setting undefined', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');
      ctx.setCurrentStructure('struct-1');

      ctx.setCurrentStructure(undefined);

      expect(ctx.session.currentStructureId).toBeUndefined();
    });
  });

  describe('requireProject', () => {
    it('should return project ID when set', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');
      ctx.setCurrentProject('proj-1');

      expect(ctx.requireProject()).toBe('proj-1');
    });

    it('should throw when no project is set', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');

      expect(() => ctx.requireProject()).toThrow('No project loaded');
    });
  });

  describe('getData/setData', () => {
    it('should store and retrieve domain data', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');

      ctx.setData('customKey', { foo: 'bar' });

      expect(ctx.getData('customKey')).toEqual({ foo: 'bar' });
    });

    it('should return undefined for unknown keys', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');

      expect(ctx.getData('unknown')).toBeUndefined();
    });

    it('should persist data across context instances', () => {
      const ctx1 = createSessionContext(sessionManager, 'conn-1');
      ctx1.setData('key', 'value');

      const ctx2 = createSessionContext(sessionManager, 'conn-1');
      expect(ctx2.getData('key')).toBe('value');
    });
  });

  describe('updateSession', () => {
    it('should delegate to session manager', () => {
      const ctx = createSessionContext(sessionManager, 'conn-1');

      ctx.updateSession({ currentProjectId: 'proj-1' });

      expect(ctx.session.currentProjectId).toBe('proj-1');
    });
  });
});
