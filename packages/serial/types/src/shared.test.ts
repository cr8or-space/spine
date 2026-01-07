import { describe, expect, it } from 'vitest';

import {
  CharacterArcTypeSchema,
  CharacterRoleSchema,
  ContentLocationSchema,
  PlotThreadScopeSchema,
  PlotThreadStatusSchema,
  PlotThreadTypeSchema,
  PromisePayoffSchema,
  PromiseStatusSchema,
  RelationshipTypeSchema,
} from './shared';

describe('shared schemas', () => {
  describe('ContentLocationSchema', () => {
    it('accepts valid content location with all fields', () => {
      const result = ContentLocationSchema.safeParse({
        contentId: 'content-123',
        chapterNumber: 5,
        position: 10,
      });
      expect(result.success).toBe(true);
    });

    it('accepts content location with only contentId', () => {
      const result = ContentLocationSchema.safeParse({
        contentId: 'content-123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid contentId', () => {
      const result = ContentLocationSchema.safeParse({
        contentId: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-positive chapter number', () => {
      const result = ContentLocationSchema.safeParse({
        contentId: 'content-123',
        chapterNumber: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-positive position', () => {
      const result = ContentLocationSchema.safeParse({
        contentId: 'content-123',
        position: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer chapter number', () => {
      const result = ContentLocationSchema.safeParse({
        contentId: 'content-123',
        chapterNumber: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('RelationshipTypeSchema', () => {
    const validTypes = ['family', 'friend', 'enemy', 'romantic', 'professional', 'rival', 'mentor', 'other'];

    it.each(validTypes)('accepts valid type: %s', (type) => {
      const result = RelationshipTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = RelationshipTypeSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('CharacterArcTypeSchema', () => {
    const validTypes = [
      'positive-change',
      'negative-change',
      'flat',
      'corruption',
      'redemption',
      'coming-of-age',
      'disillusionment',
    ];

    it.each(validTypes)('accepts valid type: %s', (type) => {
      const result = CharacterArcTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = CharacterArcTypeSchema.safeParse('growth');
      expect(result.success).toBe(false);
    });
  });

  describe('CharacterRoleSchema', () => {
    const validRoles = ['protagonist', 'antagonist', 'major', 'supporting', 'minor'];

    it.each(validRoles)('accepts valid role: %s', (role) => {
      const result = CharacterRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = CharacterRoleSchema.safeParse('hero');
      expect(result.success).toBe(false);
    });
  });

  describe('PlotThreadTypeSchema', () => {
    const validTypes = [
      'main-plot',
      'subplot',
      'mystery',
      'romance',
      'conflict',
      'character-arc',
      'worldbuilding',
      'other',
    ];

    it.each(validTypes)('accepts valid type: %s', (type) => {
      const result = PlotThreadTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = PlotThreadTypeSchema.safeParse('main');
      expect(result.success).toBe(false);
    });
  });

  describe('PlotThreadScopeSchema', () => {
    const validScopes = ['scene', 'chapter', 'arc', 'book', 'series'];

    it.each(validScopes)('accepts valid scope: %s', (scope) => {
      const result = PlotThreadScopeSchema.safeParse(scope);
      expect(result.success).toBe(true);
    });

    it('rejects invalid scope', () => {
      const result = PlotThreadScopeSchema.safeParse('novel');
      expect(result.success).toBe(false);
    });
  });

  describe('PlotThreadStatusSchema', () => {
    const validStatuses = ['planned', 'active', 'dormant', 'resolved', 'abandoned'];

    it.each(validStatuses)('accepts valid status: %s', (status) => {
      const result = PlotThreadStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = PlotThreadStatusSchema.safeParse('completed');
      expect(result.success).toBe(false);
    });
  });

  describe('PromisePayoffSchema', () => {
    const validPayoffs = ['immediate', 'short-term', 'medium-term', 'long-term', 'series-end'];

    it.each(validPayoffs)('accepts valid payoff: %s', (payoff) => {
      const result = PromisePayoffSchema.safeParse(payoff);
      expect(result.success).toBe(true);
    });

    it('rejects invalid payoff', () => {
      const result = PromisePayoffSchema.safeParse('never');
      expect(result.success).toBe(false);
    });
  });

  describe('PromiseStatusSchema', () => {
    const validStatuses = ['pending', 'fulfilled', 'subverted', 'abandoned'];

    it.each(validStatuses)('accepts valid status: %s', (status) => {
      const result = PromiseStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = PromiseStatusSchema.safeParse('completed');
      expect(result.success).toBe(false);
    });
  });
});
