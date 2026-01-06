/**
 * Tests for CLI entry point
 */

import { describe, it, expect } from 'vitest';

describe('CLI', () => {
  it('should export commands', async () => {
    // Just verify the modules can be imported without errors
    const { createProjectCommand } = await import('./commands/project.js');
    const { createBibleCommand } = await import('./commands/bible.js');
    const { createStructureCommand } = await import('./commands/structure.js');
    const { createContentCommand } = await import('./commands/content.js');
    const { createGenerateCommand } = await import('./commands/generate.js');
    const { createReviewCommand } = await import('./commands/review.js');
    const { createConfigCommand } = await import('./commands/config.js');

    expect(typeof createProjectCommand).toBe('function');
    expect(typeof createBibleCommand).toBe('function');
    expect(typeof createStructureCommand).toBe('function');
    expect(typeof createContentCommand).toBe('function');
    expect(typeof createGenerateCommand).toBe('function');
    expect(typeof createReviewCommand).toBe('function');
    expect(typeof createConfigCommand).toBe('function');
  });

  it('should create command instances', async () => {
    const { createProjectCommand } = await import('./commands/project.js');
    const { createConfigCommand } = await import('./commands/config.js');

    const projectCmd = createProjectCommand();
    const configCmd = createConfigCommand();

    expect(projectCmd.name()).toBe('project');
    expect(configCmd.name()).toBe('config');
  });

  it('should have subcommands', async () => {
    const { createProjectCommand } = await import('./commands/project.js');

    const projectCmd = createProjectCommand();
    const subcommands = projectCmd.commands.map((c) => c.name());

    expect(subcommands).toContain('list');
    expect(subcommands).toContain('create');
    expect(subcommands).toContain('show');
    expect(subcommands).toContain('select');
    expect(subcommands).toContain('delete');
  });
});
