/**
 * Auto-save functionality for projects
 *
 * Provides automatic background saving with:
 * - Configurable save interval
 * - Dirty tracking to avoid unnecessary writes
 * - Save callbacks for UI notification
 * - Error handling and recovery
 */

import type { Project } from '@repo/types';

import type { ProjectService } from './project-service';

export interface AutoSaveOptions {
  /** Interval in seconds between saves (0 to disable) */
  intervalSeconds: number;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save completes successfully */
  onSaveComplete?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

export interface AutoSaveState {
  /** Whether auto-save is currently enabled */
  enabled: boolean;
  /** Whether there are unsaved changes */
  dirty: boolean;
  /** Timestamp of last successful save */
  lastSaveAt: string | null;
  /** Whether a save is currently in progress */
  saving: boolean;
  /** Number of pending changes since last save */
  pendingChanges: number;
}

export interface AutoSaveController {
  /** Get current auto-save state */
  getState(): AutoSaveState;
  /** Mark the project as having unsaved changes */
  markDirty(): void;
  /** Trigger an immediate save */
  saveNow(): Promise<void>;
  /** Start auto-save timer */
  start(): void;
  /** Stop auto-save timer */
  stop(): void;
  /** Update the project reference */
  setProject(project: Project): void;
  /** Update auto-save options */
  setOptions(options: Partial<AutoSaveOptions>): void;
  /** Dispose of the controller (stop timer, cleanup) */
  dispose(): void;
}

/**
 * Create an auto-save controller for a project
 */
export function createAutoSaveController(
  projectService: ProjectService,
  initialProject: Project,
  options: AutoSaveOptions
): AutoSaveController {
  let project = initialProject;
  let currentOptions = { ...options };
  let timerId: ReturnType<typeof setInterval> | null = null;

  const state: AutoSaveState = {
    enabled: options.intervalSeconds > 0,
    dirty: false,
    lastSaveAt: null,
    saving: false,
    pendingChanges: 0,
  };

  /**
   * Perform the save operation
   */
  async function performSave(): Promise<void> {
    if (!state.dirty || state.saving) {
      return;
    }

    state.saving = true;
    currentOptions.onSaveStart?.();

    try {
      // Save is synchronous with better-sqlite3, but we wrap it for consistency
      await new Promise<void>((resolve, reject) => {
        try {
          projectService.saveProject(project);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      state.dirty = false;
      state.pendingChanges = 0;
      state.lastSaveAt = new Date().toISOString();
      currentOptions.onSaveComplete?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      currentOptions.onSaveError?.(err);
      throw err;
    } finally {
      state.saving = false;
    }
  }

  /**
   * Start the auto-save timer
   */
  function startTimer(): void {
    if (timerId !== null || currentOptions.intervalSeconds <= 0) {
      return;
    }

    timerId = setInterval(() => {
      performSave().catch(() => {
        // Error already handled by callback
      });
    }, currentOptions.intervalSeconds * 1000);

    state.enabled = true;
  }

  /**
   * Stop the auto-save timer
   */
  function stopTimer(): void {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    state.enabled = false;
  }

  return {
    getState(): AutoSaveState {
      return { ...state };
    },

    markDirty(): void {
      state.dirty = true;
      state.pendingChanges++;
    },

    async saveNow(): Promise<void> {
      return performSave();
    },

    start(): void {
      startTimer();
    },

    stop(): void {
      stopTimer();
    },

    setProject(newProject: Project): void {
      project = newProject;
      state.dirty = true;
      state.pendingChanges++;
    },

    setOptions(newOptions: Partial<AutoSaveOptions>): void {
      const wasEnabled = state.enabled;
      const oldInterval = currentOptions.intervalSeconds;

      currentOptions = { ...currentOptions, ...newOptions };

      // Restart timer if interval changed
      if (newOptions.intervalSeconds !== undefined && newOptions.intervalSeconds !== oldInterval) {
        if (wasEnabled) {
          stopTimer();
          if (currentOptions.intervalSeconds > 0) {
            startTimer();
          }
        }
      }
    },

    dispose(): void {
      stopTimer();
    },
  };
}

/**
 * Hook for debounced change tracking
 *
 * Returns a function that should be called whenever the project changes.
 * Changes are debounced to avoid excessive dirty marking.
 */
export function createChangeTracker(
  controller: AutoSaveController,
  debounceMs = 500
): (immediate?: boolean) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (immediate = false) => {
    if (immediate) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      controller.markDirty();
      return;
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      controller.markDirty();
      timeoutId = null;
    }, debounceMs);
  };
}

/**
 * Auto-save with conflict detection
 *
 * Useful when multiple tabs might be editing the same project.
 * Compares timestamps before saving to detect external changes.
 */
export interface ConflictAwareAutoSave extends AutoSaveController {
  /** Check if there's a conflict with external changes */
  checkForConflict(): Promise<boolean>;
  /** Force save, overwriting any external changes */
  forceSave(): Promise<void>;
}

export function createConflictAwareAutoSave(
  projectService: ProjectService,
  initialProject: Project,
  options: AutoSaveOptions
): ConflictAwareAutoSave {
  const base = createAutoSaveController(projectService, initialProject, options);
  let lastKnownUpdate = initialProject.updatedAt;

  return {
    ...base,

    async checkForConflict(): Promise<boolean> {
      const current = projectService.loadProject(initialProject.id);
      if (!current) return false;

      return current.updatedAt !== lastKnownUpdate;
    },

    async forceSave(): Promise<void> {
      await base.saveNow();
      const current = projectService.loadProject(initialProject.id);
      if (current) {
        lastKnownUpdate = current.updatedAt;
      }
    },

    async saveNow(): Promise<void> {
      const hasConflict = await this.checkForConflict();
      if (hasConflict) {
        const error = new Error('Conflict detected: project was modified externally');
        options.onSaveError?.(error);
        throw error;
      }

      await base.saveNow();
      const current = projectService.loadProject(initialProject.id);
      if (current) {
        lastKnownUpdate = current.updatedAt;
      }
    },
  };
}
