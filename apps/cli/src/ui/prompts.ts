/**
 * Interactive Prompts
 *
 * Provides interactive prompts for user input using @inquirer/prompts.
 */

import { input, select, confirm, editor } from '@inquirer/prompts';

export interface SelectOption<T> {
  name: string;
  value: T;
  description?: string;
}

/**
 * Prompt for text input
 */
export async function promptText(message: string, defaultValue?: string): Promise<string> {
  return input({
    message,
    default: defaultValue
  });
}

/**
 * Prompt for selection from a list
 */
export async function promptSelect<T>(
  message: string,
  choices: SelectOption<T>[]
): Promise<T> {
  return select({
    message,
    choices: choices.map((c) => ({
      name: c.name,
      value: c.value,
      description: c.description
    }))
  });
}

/**
 * Prompt for yes/no confirmation
 */
export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  return confirm({
    message,
    default: defaultValue
  });
}

/**
 * Prompt for multi-line text using an editor
 */
export async function promptEditor(message: string, defaultValue?: string): Promise<string> {
  return editor({
    message,
    default: defaultValue
  });
}

/**
 * Prompt for project selection
 */
export async function promptProject(
  projects: Array<{ id: string; title: string }>
): Promise<string> {
  if (projects.length === 0) {
    throw new Error('No projects available. Create a project first.');
  }

  return promptSelect('Select project:', projects.map((p) => ({
    name: p.title,
    value: p.id
  })));
}

/**
 * Prompt for structure type selection
 */
export async function promptStructureType(): Promise<'book' | 'arc' | 'chapter' | 'scene'> {
  return promptSelect('Select structure type:', [
    { name: 'Book', value: 'book' as const },
    { name: 'Arc', value: 'arc' as const },
    { name: 'Chapter', value: 'chapter' as const },
    { name: 'Scene', value: 'scene' as const }
  ]);
}

/**
 * Prompt for content status selection
 */
export async function promptContentStatus(): Promise<'draft' | 'review' | 'approved' | 'published'> {
  return promptSelect('Select status:', [
    { name: 'Draft', value: 'draft' as const },
    { name: 'In Review', value: 'review' as const },
    { name: 'Approved', value: 'approved' as const },
    { name: 'Published', value: 'published' as const }
  ]);
}
