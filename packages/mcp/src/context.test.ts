/**
 * Session context tests
 */

import { describe, it, expect } from 'vitest';
import {
  createSessionContext,
  hasProject,
  requireProjectId,
  requireStructureId,
  loadProject,
  selectStructure,
  clearContext
} from './context';

describe('SessionContext', () => {
  describe('createSessionContext', () => {
    it('creates empty context', () => {
      const ctx = createSessionContext();
      expect(ctx.currentProjectId).toBeNull();
      expect(ctx.currentStructureId).toBeNull();
      expect(ctx.currentProjectTitle).toBeNull();
    });
  });

  describe('hasProject', () => {
    it('returns false for empty context', () => {
      const ctx = createSessionContext();
      expect(hasProject(ctx)).toBe(false);
    });

    it('returns true after loading project', () => {
      const ctx = createSessionContext();
      loadProject(ctx, 'proj-1', 'Test Project');
      expect(hasProject(ctx)).toBe(true);
    });
  });

  describe('requireProjectId', () => {
    it('throws when no project loaded', () => {
      const ctx = createSessionContext();
      expect(() => requireProjectId(ctx)).toThrow('No project loaded');
    });

    it('returns project ID when loaded', () => {
      const ctx = createSessionContext();
      loadProject(ctx, 'proj-1', 'Test Project');
      expect(requireProjectId(ctx)).toBe('proj-1');
    });
  });

  describe('requireStructureId', () => {
    it('throws when no structure selected', () => {
      const ctx = createSessionContext();
      expect(() => requireStructureId(ctx)).toThrow('No structure selected');
    });

    it('returns structure ID when selected', () => {
      const ctx = createSessionContext();
      selectStructure(ctx, 'struct-1');
      expect(requireStructureId(ctx)).toBe('struct-1');
    });
  });

  describe('loadProject', () => {
    it('sets project ID and title', () => {
      const ctx = createSessionContext();
      loadProject(ctx, 'proj-1', 'My Novel');

      expect(ctx.currentProjectId).toBe('proj-1');
      expect(ctx.currentProjectTitle).toBe('My Novel');
    });

    it('clears structure selection', () => {
      const ctx = createSessionContext();
      selectStructure(ctx, 'struct-1');
      loadProject(ctx, 'proj-1', 'My Novel');

      expect(ctx.currentStructureId).toBeNull();
    });
  });

  describe('selectStructure', () => {
    it('sets structure ID', () => {
      const ctx = createSessionContext();
      selectStructure(ctx, 'struct-1');

      expect(ctx.currentStructureId).toBe('struct-1');
    });
  });

  describe('clearContext', () => {
    it('clears all context fields', () => {
      const ctx = createSessionContext();
      loadProject(ctx, 'proj-1', 'My Novel');
      selectStructure(ctx, 'struct-1');

      clearContext(ctx);

      expect(ctx.currentProjectId).toBeNull();
      expect(ctx.currentProjectTitle).toBeNull();
      expect(ctx.currentStructureId).toBeNull();
    });
  });
});
