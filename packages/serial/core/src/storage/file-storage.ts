/**
 * File-based content storage for backup and export
 *
 * While the primary storage is SQLite, this module handles:
 * - Exporting content to markdown files
 * - Importing content from markdown files
 * - Project backup/restore as JSON
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import type { Content, Project, Structure } from '@repo/serial-types';

export interface FileStorageOptions {
  /** Base directory for file storage */
  basePath: string;
}

export interface FileStorage {
  /** Export a single content item to markdown */
  exportContent(projectId: string, content: Content, structure: Structure): string;
  /** Export all project content to a directory */
  exportProject(project: Project, outputDir: string): void;
  /** Import content from a markdown file */
  importContent(filePath: string): { text: string; metadata: ContentFileMetadata };
  /** Backup entire project to JSON */
  backupProject(project: Project, outputPath: string): void;
  /** Restore project from JSON backup */
  restoreProject(inputPath: string): Project;
  /** Get the content directory for a project */
  getProjectContentDir(projectId: string): string;
  /** Ensure project directory exists */
  ensureProjectDir(projectId: string): void;
}

/**
 * Metadata stored in content file frontmatter
 */
export interface ContentFileMetadata {
  id: string;
  structureId: string;
  chapterNumber?: number;
  status: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create file storage instance
 */
export function createFileStorage(options: FileStorageOptions): FileStorage {
  const { basePath } = options;

  // Ensure base path exists
  if (!existsSync(basePath)) {
    mkdirSync(basePath, { recursive: true });
  }

  /**
   * Generate frontmatter YAML from metadata
   */
  function generateFrontmatter(metadata: ContentFileMetadata): string {
    const lines = ['---'];
    lines.push(`id: "${metadata.id}"`);
    lines.push(`structureId: "${metadata.structureId}"`);
    if (metadata.chapterNumber !== undefined) {
      lines.push(`chapterNumber: ${metadata.chapterNumber}`);
    }
    lines.push(`status: "${metadata.status}"`);
    lines.push(`wordCount: ${metadata.wordCount}`);
    lines.push(`createdAt: "${metadata.createdAt}"`);
    lines.push(`updatedAt: "${metadata.updatedAt}"`);
    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Parse frontmatter from markdown content
   */
  function parseFrontmatter(content: string): { metadata: ContentFileMetadata; text: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      throw new Error('Invalid markdown file: missing frontmatter');
    }

    const [, frontmatterStr, text] = match;
    const metadata: Partial<ContentFileMetadata> = {};

    for (const line of frontmatterStr.split('\n')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      switch (key) {
        case 'id':
          metadata.id = value;
          break;
        case 'structureId':
          metadata.structureId = value;
          break;
        case 'chapterNumber':
          metadata.chapterNumber = parseInt(value, 10);
          break;
        case 'status':
          metadata.status = value;
          break;
        case 'wordCount':
          metadata.wordCount = parseInt(value, 10);
          break;
        case 'createdAt':
          metadata.createdAt = value;
          break;
        case 'updatedAt':
          metadata.updatedAt = value;
          break;
      }
    }

    if (!metadata.id || !metadata.structureId || !metadata.status || !metadata.createdAt || !metadata.updatedAt) {
      throw new Error('Invalid frontmatter: missing required fields');
    }

    return {
      metadata: metadata as ContentFileMetadata,
      text: text.trim(),
    };
  }

  /**
   * Generate safe filename from structure title
   */
  function generateFilename(structure: Structure, content: Content): string {
    const sanitized = structure.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const prefix = content.chapterNumber ? `${String(content.chapterNumber).padStart(3, '0')}-` : '';
    return `${prefix}${sanitized}.md`;
  }

  return {
    exportContent(_projectId: string, content: Content, structure: Structure): string {
      const metadata: ContentFileMetadata = {
        id: content.id,
        structureId: content.structureId,
        chapterNumber: content.chapterNumber,
        status: content.status,
        wordCount: content.versions[content.currentVersion - 1]?.wordCount ?? 0,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
      };

      const frontmatter = generateFrontmatter(metadata);
      const title = `# ${structure.title}\n\n`;
      return `${frontmatter}\n\n${title}${content.text}`;
    },

    exportProject(project: Project, outputDir: string): void {
      // Create output directory
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Build structure lookup
      const structureMap = new Map<string, Structure>();

      function collectStructures(s: Structure) {
        structureMap.set(s.id, s);
        for (const child of s.children) {
          collectStructures(child);
        }
      }
      collectStructures(project.structure);

      // Export each content item
      for (const content of project.content) {
        const structure = structureMap.get(content.structureId);
        if (!structure) continue;

        const filename = generateFilename(structure, content);
        const markdown = this.exportContent(project.id, content, structure);
        const filePath = join(outputDir, filename);

        writeFileSync(filePath, markdown, 'utf-8');
      }

      // Export project metadata
      const metadataPath = join(outputDir, 'project.json');
      writeFileSync(
        metadataPath,
        JSON.stringify(
          {
            id: project.id,
            title: project.title,
            format: project.format,
            metadata: project.metadata,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf-8'
      );
    },

    importContent(filePath: string): { text: string; metadata: ContentFileMetadata } {
      const content = readFileSync(filePath, 'utf-8');
      return parseFrontmatter(content);
    },

    backupProject(project: Project, outputPath: string): void {
      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        project,
      };

      writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf-8');
    },

    restoreProject(inputPath: string): Project {
      const content = readFileSync(inputPath, 'utf-8');
      const backup = JSON.parse(content) as { version: number; project: Project };

      if (backup.version !== 1) {
        throw new Error(`Unsupported backup version: ${backup.version}`);
      }

      return backup.project;
    },

    getProjectContentDir(projectId: string): string {
      return join(basePath, 'projects', projectId, 'content');
    },

    ensureProjectDir(projectId: string): void {
      const projectDir = join(basePath, 'projects', projectId);
      if (!existsSync(projectDir)) {
        mkdirSync(projectDir, { recursive: true });
      }

      const contentDir = this.getProjectContentDir(projectId);
      if (!existsSync(contentDir)) {
        mkdirSync(contentDir, { recursive: true });
      }
    },
  };
}
