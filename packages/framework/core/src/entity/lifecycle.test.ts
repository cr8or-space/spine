/**
 * Tests for entity lifecycle management.
 */

import { describe, it, expect } from 'vitest';

import type { SpinePosition } from '@repo/framework-types';

import {
  isValidLifecycleTransition,
  getValidNextLifecycles,
  createLinearPositionComparator,
  VALID_LIFECYCLE_TRANSITIONS,
} from './lifecycle';

describe('VALID_LIFECYCLE_TRANSITIONS', () => {
  it('defines valid transitions from active', () => {
    expect(VALID_LIFECYCLE_TRANSITIONS.active).toContain('retired');
    expect(VALID_LIFECYCLE_TRANSITIONS.active).toContain('archived');
  });

  it('defines valid transitions from retired', () => {
    expect(VALID_LIFECYCLE_TRANSITIONS.retired).toContain('archived');
    expect(VALID_LIFECYCLE_TRANSITIONS.retired).toContain('active');
  });

  it('defines valid transitions from archived', () => {
    expect(VALID_LIFECYCLE_TRANSITIONS.archived).toContain('active');
  });
});

describe('isValidLifecycleTransition', () => {
  it('returns true for valid transitions', () => {
    expect(isValidLifecycleTransition('active', 'retired')).toBe(true);
    expect(isValidLifecycleTransition('active', 'archived')).toBe(true);
    expect(isValidLifecycleTransition('retired', 'archived')).toBe(true);
    expect(isValidLifecycleTransition('retired', 'active')).toBe(true);
    expect(isValidLifecycleTransition('archived', 'active')).toBe(true);
  });

  it('returns false for invalid transitions', () => {
    expect(isValidLifecycleTransition('active', 'active')).toBe(false);
    expect(isValidLifecycleTransition('archived', 'retired')).toBe(false);
  });
});

describe('getValidNextLifecycles', () => {
  it('returns valid next states for active', () => {
    const next = getValidNextLifecycles('active');
    expect(next).toContain('retired');
    expect(next).toContain('archived');
  });

  it('returns valid next states for retired', () => {
    const next = getValidNextLifecycles('retired');
    expect(next).toContain('archived');
    expect(next).toContain('active');
  });

  it('returns valid next states for archived', () => {
    const next = getValidNextLifecycles('archived');
    expect(next).toContain('active');
  });
});

describe('createLinearPositionComparator', () => {
  const compare = createLinearPositionComparator();

  it('returns negative when a < b (same node)', () => {
    const a: SpinePosition = { nodeId: 'ch1', order: 1 };
    const b: SpinePosition = { nodeId: 'ch1', order: 5 };
    expect(compare(a, b)).toBeLessThan(0);
  });

  it('returns positive when a > b (same node)', () => {
    const a: SpinePosition = { nodeId: 'ch1', order: 5 };
    const b: SpinePosition = { nodeId: 'ch1', order: 1 };
    expect(compare(a, b)).toBeGreaterThan(0);
  });

  it('returns zero when equal (same node)', () => {
    const a: SpinePosition = { nodeId: 'ch1', order: 3 };
    const b: SpinePosition = { nodeId: 'ch1', order: 3 };
    expect(compare(a, b)).toBe(0);
  });

  it('compares by order for different nodes', () => {
    const a: SpinePosition = { nodeId: 'ch1', order: 1 };
    const b: SpinePosition = { nodeId: 'ch2', order: 5 };
    expect(compare(a, b)).toBeLessThan(0);
  });
});
