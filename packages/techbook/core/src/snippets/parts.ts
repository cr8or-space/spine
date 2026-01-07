/**
 * Named part management for code snippets.
 *
 * Parts are named sections within files that can be targeted by subsequent
 * snippets for modification. Parts can be nested (e.g., "parseExpression.setup").
 */

import type { FilePart, Snippet } from '@repo/techbook-types';

/**
 * A part with its current content and metadata
 */
export interface PartState {
  /** Part information */
  part: FilePart;
  /** Current content of the part */
  content: string;
  /** IDs of snippets that contributed to this part */
  sourceSnippetIds: string[];
  /** Whether this part has been deleted */
  deleted: boolean;
}

/**
 * Error during part operations
 */
export interface PartError {
  /** The snippet that caused the error */
  snippetId: string;
  /** Error message */
  message: string;
  /** The file being operated on */
  file: string;
  /** The part being operated on (if any) */
  part?: string;
}

/**
 * Result of processing snippets for a file
 */
export interface FilePartsResult {
  /** The file path */
  file: string;
  /** Successfully processed parts */
  parts: PartState[];
  /** Errors encountered */
  errors: PartError[];
}

/**
 * Manages parts for a single file
 */
export interface PartManager {
  /** Get the file path */
  getFile(): string;

  /** Get all parts (including deleted) */
  getAllParts(): PartState[];

  /** Get only active (non-deleted) parts */
  getActiveParts(): PartState[];

  /** Get a specific part by name */
  getPart(name: string): PartState | undefined;

  /** Check if a part exists and is active */
  hasPart(name: string): boolean;

  /** Get child parts of a parent part */
  getChildParts(parentName: string): PartState[];

  /** Apply a snippet operation to this file */
  applySnippet(snippet: Snippet): PartError | undefined;

  /** Get the assembled content of the file */
  assemble(): string;

  /** Get errors encountered during processing */
  getErrors(): PartError[];
}

/**
 * Parse a part name into parent and child components.
 * e.g., "parseExpression.setup" -> { parent: "parseExpression", child: "setup" }
 */
export function parsePartName(name: string): { parent: string | undefined; child: string } {
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) {
    return { parent: undefined, child: name };
  }
  return {
    parent: name.substring(0, lastDot),
    child: name.substring(lastDot + 1),
  };
}

/**
 * Get the full hierarchy of a part name.
 * e.g., "a.b.c" -> ["a", "a.b", "a.b.c"]
 */
export function getPartHierarchy(name: string): string[] {
  const parts = name.split('.');
  const result: string[] = [];
  let current = '';

  for (const part of parts) {
    current = current ? `${current}.${part}` : part;
    result.push(current);
  }

  return result;
}

/**
 * Check if a part is a direct or indirect child of another part.
 */
export function isChildPart(child: string, parent: string): boolean {
  return child.startsWith(parent + '.');
}

/**
 * Create a part manager for a file
 */
export function createPartManager(file: string): PartManager {
  const parts = new Map<string, PartState>();
  const errors: PartError[] = [];
  // Track content that doesn't belong to any part (file-level content)
  let fileContent = '';

  function createPartState(name: string, snippet: Snippet, content: string): PartState {
    const { parent } = parsePartName(name);
    return {
      part: {
        name,
        file,
        parentPart: parent,
      },
      content,
      sourceSnippetIds: [snippet.id],
      deleted: false,
    };
  }

  function addError(snippet: Snippet, message: string): PartError {
    const error: PartError = {
      snippetId: snippet.id,
      message,
      file: snippet.file,
      part: snippet.part,
    };
    errors.push(error);
    return error;
  }

  return {
    getFile(): string {
      return file;
    },

    getAllParts(): PartState[] {
      return Array.from(parts.values());
    },

    getActiveParts(): PartState[] {
      return Array.from(parts.values()).filter((p) => !p.deleted);
    },

    getPart(name: string): PartState | undefined {
      return parts.get(name);
    },

    hasPart(name: string): boolean {
      const part = parts.get(name);
      return part !== undefined && !part.deleted;
    },

    getChildParts(parentName: string): PartState[] {
      return Array.from(parts.values()).filter(
        (p) => p.part.parentPart === parentName && !p.deleted
      );
    },

    applySnippet(snippet: Snippet): PartError | undefined {
      if (snippet.file !== file) {
        return addError(snippet, `Snippet targets file "${snippet.file}" but manager is for "${file}"`);
      }

      const partName = snippet.part;
      const operation = snippet.operation;

      // Handle file-level operations (no part specified)
      if (!partName) {
        switch (operation) {
          case 'introduce':
            if (fileContent !== '' || parts.size > 0) {
              return addError(snippet, 'Cannot introduce file - file already has content');
            }
            fileContent = snippet.code;
            break;
          case 'replace':
            fileContent = snippet.code;
            // Clear all parts when replacing entire file
            parts.clear();
            break;
          case 'append':
            fileContent += (fileContent && !fileContent.endsWith('\n') ? '\n' : '') + snippet.code;
            break;
          case 'prepend':
            fileContent = snippet.code + (fileContent ? '\n' : '') + fileContent;
            break;
          case 'delete':
            fileContent = '';
            parts.clear();
            break;
        }
        return undefined;
      }

      // Handle part-level operations
      const existingPart = parts.get(partName);

      switch (operation) {
        case 'introduce': {
          if (existingPart && !existingPart.deleted) {
            return addError(
              snippet,
              `Cannot introduce part "${partName}" - it already exists`
            );
          }
          // Check parent exists (if nested part)
          const { parent } = parsePartName(partName);
          if (parent && !this.hasPart(parent)) {
            return addError(
              snippet,
              `Cannot introduce part "${partName}" - parent part "${parent}" does not exist`
            );
          }
          parts.set(partName, createPartState(partName, snippet, snippet.code));
          break;
        }

        case 'replace': {
          if (!existingPart || existingPart.deleted) {
            return addError(
              snippet,
              `Cannot replace part "${partName}" - it does not exist`
            );
          }
          // Delete all child parts when replacing
          for (const [name, state] of parts) {
            if (isChildPart(name, partName)) {
              state.deleted = true;
            }
          }
          existingPart.content = snippet.code;
          existingPart.sourceSnippetIds.push(snippet.id);
          existingPart.deleted = false;
          break;
        }

        case 'append': {
          if (!existingPart || existingPart.deleted) {
            return addError(
              snippet,
              `Cannot append to part "${partName}" - it does not exist`
            );
          }
          const separator = existingPart.content && !existingPart.content.endsWith('\n') ? '\n' : '';
          existingPart.content += separator + snippet.code;
          existingPart.sourceSnippetIds.push(snippet.id);
          break;
        }

        case 'prepend': {
          if (!existingPart || existingPart.deleted) {
            return addError(
              snippet,
              `Cannot prepend to part "${partName}" - it does not exist`
            );
          }
          const separator = snippet.code && !snippet.code.endsWith('\n') ? '\n' : '';
          existingPart.content = snippet.code + separator + existingPart.content;
          existingPart.sourceSnippetIds.push(snippet.id);
          break;
        }

        case 'delete': {
          if (!existingPart || existingPart.deleted) {
            return addError(
              snippet,
              `Cannot delete part "${partName}" - it does not exist`
            );
          }
          existingPart.deleted = true;
          existingPart.sourceSnippetIds.push(snippet.id);
          // Delete all child parts
          for (const [name, state] of parts) {
            if (isChildPart(name, partName)) {
              state.deleted = true;
              state.sourceSnippetIds.push(snippet.id);
            }
          }
          break;
        }
      }

      return undefined;
    },

    assemble(): string {
      // Get active parts sorted by name (for deterministic output)
      const activeParts = this.getActiveParts().sort((a, b) =>
        a.part.name.localeCompare(b.part.name)
      );

      // If no parts, just return file content
      if (activeParts.length === 0) {
        return fileContent;
      }

      // Build content from parts
      // For now, simple concatenation. A more sophisticated approach
      // would use markers or insertion points.
      const partContents = activeParts
        .filter((p) => !p.part.parentPart) // Only top-level parts
        .map((p) => assemblePartWithChildren(p, activeParts));

      // Combine file content with parts
      if (fileContent) {
        return fileContent + '\n' + partContents.join('\n');
      }
      return partContents.join('\n');
    },

    getErrors(): PartError[] {
      return [...errors];
    },
  };
}

/**
 * Assemble a part with its nested children
 */
function assemblePartWithChildren(part: PartState, allParts: PartState[]): string {
  const children = allParts
    .filter((p) => p.part.parentPart === part.part.name)
    .sort((a, b) => a.part.name.localeCompare(b.part.name));

  if (children.length === 0) {
    return part.content;
  }

  // Insert children content after parent content
  const childContents = children.map((c) => assemblePartWithChildren(c, allParts));
  return part.content + '\n' + childContents.join('\n');
}

/**
 * Validate that all parent parts exist for a part hierarchy.
 * Returns missing parent names.
 */
export function validatePartHierarchy(
  partName: string,
  existingParts: Set<string>
): string[] {
  const hierarchy = getPartHierarchy(partName);
  const missing: string[] = [];

  // Check all ancestors (except the last one which is the part itself)
  for (let i = 0; i < hierarchy.length - 1; i++) {
    const ancestor = hierarchy[i];
    if (ancestor && !existingParts.has(ancestor)) {
      missing.push(ancestor);
    }
  }

  return missing;
}

/**
 * Process a sequence of snippets for a file and return the result.
 */
export function processSnippetsForFile(
  file: string,
  snippets: Snippet[]
): FilePartsResult {
  const manager = createPartManager(file);

  // Apply snippets in order
  for (const snippet of snippets) {
    manager.applySnippet(snippet);
  }

  return {
    file,
    parts: manager.getAllParts(),
    errors: manager.getErrors(),
  };
}
