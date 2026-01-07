/**
 * Tests for tangle output handling
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';

import type { TangleResult, TangledFile } from '@repo/techbook-types';

import {
  cleanOutputDirectory,
  compareWithManifest,
  hasOutputFiles,
  readManifest,
  writeTangledFiles,
  type TangleManifest,
} from './output';

// Helper to create a unique temp directory
async function createTempDir(): Promise<string> {
  const dir = path.join(tmpdir(), `tangle-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

// Helper to clean up temp directory
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// Helper to create a tangled file
const createTangledFile = (overrides: Partial<TangledFile>): TangledFile => ({
  path: 'src/main.ts',
  content: 'const x = 1;',
  parts: [],
  sourceSnippetIds: ['s1'],
  contentHash: '12345678',
  ...overrides,
});

// Helper to create a tangle result
const createTangleResult = (files: TangledFile[]): TangleResult => ({
  success: true,
  files,
  errors: [],
  tangledAt: new Date().toISOString(),
});

describe('writeTangledFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should write files to output directory', async () => {
    const result = createTangleResult([
      createTangledFile({ path: 'src/main.ts', content: 'const x = 1;' }),
    ]);

    const writeResult = await writeTangledFiles(result, { outputDir: tempDir });

    expect(writeResult.success).toBe(true);
    expect(writeResult.writtenFiles).toContain('src/main.ts');

    const content = await fs.readFile(path.join(tempDir, 'src/main.ts'), 'utf-8');
    expect(content).toBe('const x = 1;');
  });

  it('should create nested directories', async () => {
    const result = createTangleResult([
      createTangledFile({ path: 'deep/nested/path/file.ts', content: 'x' }),
    ]);

    const writeResult = await writeTangledFiles(result, { outputDir: tempDir });

    expect(writeResult.success).toBe(true);

    const content = await fs.readFile(path.join(tempDir, 'deep/nested/path/file.ts'), 'utf-8');
    expect(content).toBe('x');
  });

  it('should write multiple files', async () => {
    const result = createTangleResult([
      createTangledFile({ path: 'src/a.ts', content: 'a' }),
      createTangledFile({ path: 'src/b.ts', content: 'b' }),
    ]);

    const writeResult = await writeTangledFiles(result, { outputDir: tempDir });

    expect(writeResult.success).toBe(true);
    expect(writeResult.writtenFiles).toHaveLength(2);
  });

  it('should skip unchanged files when preserveTimestamps is true', async () => {
    const result = createTangleResult([
      createTangledFile({ path: 'src/main.ts', content: 'unchanged' }),
    ]);

    // Write first time
    await writeTangledFiles(result, { outputDir: tempDir });

    // Write second time with preserveTimestamps
    const writeResult = await writeTangledFiles(result, {
      outputDir: tempDir,
      preserveTimestamps: true,
    });

    expect(writeResult.skippedFiles).toContain('src/main.ts');
    expect(writeResult.writtenFiles).not.toContain('src/main.ts');
  });

  it('should clean orphan files when cleanOrphans is true', async () => {
    // Write initial file
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src/orphan.ts'), 'orphan');

    // Tangle with different file
    const result = createTangleResult([
      createTangledFile({ path: 'src/main.ts', content: 'main' }),
    ]);

    const writeResult = await writeTangledFiles(result, {
      outputDir: tempDir,
      cleanOrphans: true,
    });

    expect(writeResult.cleanedFiles).toContain('src/orphan.ts');

    const orphanExists = await fs.access(path.join(tempDir, 'src/orphan.ts'))
      .then(() => true)
      .catch(() => false);
    expect(orphanExists).toBe(false);
  });

  it('should respect cleanExtensions filter', async () => {
    // Write initial files
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src/orphan.ts'), 'ts orphan');
    await fs.writeFile(path.join(tempDir, 'src/keep.json'), 'json keep');

    const result = createTangleResult([
      createTangledFile({ path: 'src/main.ts', content: 'main' }),
    ]);

    const writeResult = await writeTangledFiles(result, {
      outputDir: tempDir,
      cleanOrphans: true,
      cleanExtensions: ['.ts'],
    });

    expect(writeResult.cleanedFiles).toContain('src/orphan.ts');

    // JSON file should be kept
    const jsonExists = await fs.access(path.join(tempDir, 'src/keep.json'))
      .then(() => true)
      .catch(() => false);
    expect(jsonExists).toBe(true);
  });

  it('should write manifest when writeManifest is true', async () => {
    const result = createTangleResult([
      createTangledFile({ path: 'src/main.ts', content: 'content' }),
    ]);

    await writeTangledFiles(result, {
      outputDir: tempDir,
      writeManifest: true,
    });

    const manifestPath = path.join(tempDir, '.tangle-manifest.json');
    const manifestExists = await fs.access(manifestPath)
      .then(() => true)
      .catch(() => false);
    expect(manifestExists).toBe(true);

    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as TangleManifest;
    expect(manifest.files).toHaveLength(1);
    expect(manifest.stats.fileCount).toBe(1);
  });

  it('should add source comment when generateSourceMaps is true', async () => {
    const result = createTangleResult([
      createTangledFile({
        path: 'src/main.ts',
        content: 'const x = 1;',
        sourceSnippetIds: ['s1', 's2'],
      }),
    ]);

    await writeTangledFiles(result, {
      outputDir: tempDir,
      generateSourceMaps: true,
    });

    const content = await fs.readFile(path.join(tempDir, 'src/main.ts'), 'utf-8');
    expect(content).toContain('Generated by Spine TechBook');
    expect(content).toContain('s1, s2');
  });
});

describe('readManifest', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should read existing manifest', async () => {
    const manifest: TangleManifest = {
      tangledAt: new Date().toISOString(),
      files: [{ path: 'src/main.ts', contentHash: '12345678', snippetCount: 1 }],
      stats: { fileCount: 1, totalLines: 10, totalSnippets: 1 },
    };

    await fs.writeFile(
      path.join(tempDir, '.tangle-manifest.json'),
      JSON.stringify(manifest)
    );

    const read = await readManifest(tempDir);

    expect(read).not.toBeNull();
    expect(read?.files).toHaveLength(1);
    expect(read?.stats.fileCount).toBe(1);
  });

  it('should return null for missing manifest', async () => {
    const read = await readManifest(tempDir);

    expect(read).toBeNull();
  });

  it('should return null for invalid manifest structure', async () => {
    await fs.writeFile(
      path.join(tempDir, '.tangle-manifest.json'),
      JSON.stringify({ invalid: 'structure' })
    );

    const read = await readManifest(tempDir);

    expect(read).toBeNull();
  });

  it('should return null for malformed JSON', async () => {
    await fs.writeFile(
      path.join(tempDir, '.tangle-manifest.json'),
      'not valid json'
    );

    const read = await readManifest(tempDir);

    expect(read).toBeNull();
  });
});

describe('compareWithManifest', () => {
  it('should detect added files', () => {
    const manifest: TangleManifest = {
      tangledAt: new Date().toISOString(),
      files: [{ path: 'src/a.ts', contentHash: '11111111', snippetCount: 1 }],
      stats: { fileCount: 1, totalLines: 10, totalSnippets: 1 },
    };

    const result = createTangleResult([
      createTangledFile({ path: 'src/a.ts', contentHash: '11111111' }),
      createTangledFile({ path: 'src/b.ts', contentHash: '22222222' }),
    ]);

    const comparison = compareWithManifest(result, manifest);

    expect(comparison.added).toEqual(['src/b.ts']);
    expect(comparison.unchanged).toEqual(['src/a.ts']);
  });

  it('should detect removed files', () => {
    const manifest: TangleManifest = {
      tangledAt: new Date().toISOString(),
      files: [
        { path: 'src/a.ts', contentHash: '11111111', snippetCount: 1 },
        { path: 'src/b.ts', contentHash: '22222222', snippetCount: 1 },
      ],
      stats: { fileCount: 2, totalLines: 20, totalSnippets: 2 },
    };

    const result = createTangleResult([
      createTangledFile({ path: 'src/a.ts', contentHash: '11111111' }),
    ]);

    const comparison = compareWithManifest(result, manifest);

    expect(comparison.removed).toEqual(['src/b.ts']);
  });

  it('should detect changed files', () => {
    const manifest: TangleManifest = {
      tangledAt: new Date().toISOString(),
      files: [{ path: 'src/a.ts', contentHash: '11111111', snippetCount: 1 }],
      stats: { fileCount: 1, totalLines: 10, totalSnippets: 1 },
    };

    const result = createTangleResult([
      createTangledFile({ path: 'src/a.ts', contentHash: '99999999' }),
    ]);

    const comparison = compareWithManifest(result, manifest);

    expect(comparison.changed).toEqual(['src/a.ts']);
    expect(comparison.unchanged).toEqual([]);
  });
});

describe('cleanOutputDirectory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should delete all files', async () => {
    // Create some files
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src/a.ts'), 'a');
    await fs.writeFile(path.join(tempDir, 'src/b.ts'), 'b');

    const cleaned = await cleanOutputDirectory(tempDir);

    expect(cleaned).toContain('src/a.ts');
    expect(cleaned).toContain('src/b.ts');

    // Verify files are gone
    const aExists = await fs.access(path.join(tempDir, 'src/a.ts'))
      .then(() => true)
      .catch(() => false);
    expect(aExists).toBe(false);
  });

  it('should handle empty directory', async () => {
    const cleaned = await cleanOutputDirectory(tempDir);

    expect(cleaned).toEqual([]);
  });

  it('should handle non-existent directory', async () => {
    const cleaned = await cleanOutputDirectory(path.join(tempDir, 'nonexistent'));

    expect(cleaned).toEqual([]);
  });
});

describe('hasOutputFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  it('should return true when directory has files', async () => {
    await fs.writeFile(path.join(tempDir, 'file.ts'), 'content');

    const has = await hasOutputFiles(tempDir);

    expect(has).toBe(true);
  });

  it('should return false for empty directory', async () => {
    const has = await hasOutputFiles(tempDir);

    expect(has).toBe(false);
  });

  it('should return false for non-existent directory', async () => {
    const has = await hasOutputFiles(path.join(tempDir, 'nonexistent'));

    expect(has).toBe(false);
  });
});
