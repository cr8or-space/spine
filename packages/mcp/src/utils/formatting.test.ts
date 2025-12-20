/**
 * Formatting utilities tests
 */

import { describe, it, expect } from 'vitest';
import type { Structure, Character, PlotThread } from '@repo/types';
import {
  formatStructureTree,
  formatCharacter,
  formatPlotThread,
  formatNumberedList,
  formatTable
} from './formatting';

describe('formatStructureTree', () => {
  it('formats simple structure', () => {
    const structure: Structure = {
      id: '1',
      projectId: 'proj',
      type: 'book',
      title: 'My Book',
      order: 0,
      createdAt: '',
      updatedAt: ''
    };

    const result = formatStructureTree(structure);
    expect(result).toContain('My Book');
    expect(result).toContain('📚');
  });

  it('includes tension target', () => {
    const structure: Structure = {
      id: '1',
      projectId: 'proj',
      type: 'chapter',
      title: 'Chapter 1',
      order: 0,
      tensionTarget: 75,
      createdAt: '',
      updatedAt: ''
    };

    const result = formatStructureTree(structure);
    expect(result).toContain('[tension: 75]');
  });

  it('formats children with indentation', () => {
    const structure: Structure = {
      id: '1',
      projectId: 'proj',
      type: 'book',
      title: 'My Book',
      order: 0,
      createdAt: '',
      updatedAt: '',
      children: [
        {
          id: '2',
          projectId: 'proj',
          type: 'chapter',
          title: 'Chapter 1',
          order: 0,
          createdAt: '',
          updatedAt: ''
        }
      ]
    };

    const result = formatStructureTree(structure);
    expect(result).toContain('My Book');
    expect(result).toContain('  📄 Chapter 1');
  });
});

describe('formatCharacter', () => {
  it('formats character with name and role', () => {
    const character: Character = {
      id: '1',
      projectId: 'proj',
      name: 'Alice',
      role: 'protagonist',
      status: 'active',
      createdAt: '',
      updatedAt: ''
    };

    const result = formatCharacter(character);
    expect(result).toContain('**Alice** (protagonist)');
  });

  it('includes traits when present', () => {
    const character: Character = {
      id: '1',
      projectId: 'proj',
      name: 'Alice',
      role: 'protagonist',
      traits: ['brave', 'curious'],
      status: 'active',
      createdAt: '',
      updatedAt: ''
    };

    const result = formatCharacter(character);
    expect(result).toContain('**Traits:** brave, curious');
  });
});

describe('formatPlotThread', () => {
  it('formats thread with name and type', () => {
    const thread: PlotThread = {
      id: '1',
      projectId: 'proj',
      name: 'The Quest',
      type: 'main',
      status: 'active',
      createdAt: '',
      updatedAt: ''
    };

    const result = formatPlotThread(thread);
    expect(result).toContain('**The Quest** (main)');
    expect(result).toContain('Status: active');
  });

  it('includes chapter range when present', () => {
    const thread: PlotThread = {
      id: '1',
      projectId: 'proj',
      name: 'The Quest',
      type: 'main',
      status: 'active',
      startChapter: 1,
      endChapter: 10,
      createdAt: '',
      updatedAt: ''
    };

    const result = formatPlotThread(thread);
    expect(result).toContain('**Range:** Chapters 1-10');
  });
});

describe('formatNumberedList', () => {
  it('formats items with numbers', () => {
    const items = ['first', 'second', 'third'];
    const result = formatNumberedList(items, (item) => item);

    expect(result).toBe('1. first\n2. second\n3. third');
  });

  it('applies formatter function', () => {
    const items = [{ name: 'A' }, { name: 'B' }];
    const result = formatNumberedList(items, (item) => item.name);

    expect(result).toBe('1. A\n2. B');
  });
});

describe('formatTable', () => {
  it('formats key-value pairs', () => {
    const data = {
      Name: 'Alice',
      Role: 'Protagonist',
      Age: 25
    };

    const result = formatTable(data);
    expect(result).toContain('Name: Alice');
    expect(result).toContain('Role: Protagonist');
    // Age is padded to match longest key
    expect(result).toContain('Age '); // padded
    expect(result).toContain(': 25');
  });

  it('filters out null and undefined values', () => {
    const data = {
      Name: 'Alice',
      Age: null,
      Role: undefined
    };

    const result = formatTable(data);
    expect(result).toContain('Name: Alice');
    expect(result).not.toContain('Age');
    expect(result).not.toContain('Role');
  });

  it('returns message for empty data', () => {
    const result = formatTable({});
    expect(result).toBe('No data');
  });
});
