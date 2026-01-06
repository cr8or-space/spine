import { describe, expect, it } from 'vitest';

import {
  createDefaultSettings,
  DEFAULT_LLM_CONFIG,
  ExtractionSettingsSchema,
  LlmConfigSchema,
  ProjectFormatSchema,
  ProjectMetadataSchema,
  ProjectSettingsSchema,
  ProjectStatsSchema,
  ProjectSummarySchema,
  RevisionSettingsSchema,
  SerialSettingsSchema,
} from './project';

describe('ProjectFormatSchema', () => {
  it('accepts all valid formats', () => {
    const formats = ['short', 'light-novel', 'web-serial'];
    for (const format of formats) {
      const result = ProjectFormatSchema.safeParse(format);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid format', () => {
    const result = ProjectFormatSchema.safeParse('novel');
    expect(result.success).toBe(false);
  });
});

describe('LlmConfigSchema', () => {
  it('validates a complete config', () => {
    const config = {
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4',
      apiKeyRef: 'OPENAI_API_KEY',
      temperature: 0.7,
      maxTokens: 4096,
      contextWindow: 128000,
    };
    const result = LlmConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const config = {
      endpoint: 'http://localhost:1234/v1',
      model: 'local-model',
    };
    const result = LlmConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.temperature).toBe(0.7);
      expect(result.data.maxTokens).toBe(4096);
      expect(result.data.contextWindow).toBe(128000);
    }
  });

  it('rejects temperature above 2', () => {
    const config = {
      endpoint: 'http://localhost:1234/v1',
      model: 'test',
      temperature: 2.5,
    };
    const result = LlmConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const config = {
      endpoint: 'not-a-url',
      model: 'test',
    };
    const result = LlmConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('RevisionSettingsSchema', () => {
  it('validates complete settings', () => {
    const settings = {
      horizonChapters: 15,
      autoCascade: true,
      previewImpact: false,
    };
    const result = RevisionSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const result = RevisionSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.horizonChapters).toBe(20);
      expect(result.data.autoCascade).toBe(false);
      expect(result.data.previewImpact).toBe(true);
    }
  });

  it('requires positive horizon chapters', () => {
    const settings = { horizonChapters: 0 };
    const result = RevisionSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });
});

describe('SerialSettingsSchema', () => {
  it('validates complete settings', () => {
    const settings = {
      cycleLength: 5,
      cycleTensionTargets: [40, 60, 70, 80, 50],
      minimumBuffer: 5,
      releaseInterval: 2,
      enforceHookVariety: true,
      maxConsecutiveSameHook: 2,
    };
    const result = SerialSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const settings = {
      cycleTensionTargets: [50, 70, 90, 70, 50],
    };
    const result = SerialSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cycleLength).toBe(5);
      expect(result.data.minimumBuffer).toBe(5);
      expect(result.data.releaseInterval).toBe(2);
      expect(result.data.enforceHookVariety).toBe(true);
      expect(result.data.maxConsecutiveSameHook).toBe(2);
    }
  });

  it('validates tension targets in range', () => {
    const settings = {
      cycleTensionTargets: [50, 150, 70], // 150 is out of range
    };
    const result = SerialSettingsSchema.safeParse(settings);
    expect(result.success).toBe(false);
  });
});

describe('ExtractionSettingsSchema', () => {
  it('validates complete settings', () => {
    const settings = {
      aggressiveness: 'aggressive',
      autoExtractTypes: ['character', 'location', 'faction', 'world-rule'],
      suggestUpdates: false,
    };
    const result = ExtractionSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const result = ExtractionSettingsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aggressiveness).toBe('moderate');
      expect(result.data.autoExtractTypes).toEqual(['character', 'location']);
      expect(result.data.suggestUpdates).toBe(true);
    }
  });

  it('validates all aggressiveness levels', () => {
    const levels = ['conservative', 'moderate', 'aggressive'] as const;
    for (const aggressiveness of levels) {
      const result = ExtractionSettingsSchema.safeParse({ aggressiveness });
      expect(result.success).toBe(true);
    }
  });
});

describe('ProjectSettingsSchema', () => {
  it('validates complete settings', () => {
    const settings = {
      llm: {
        endpoint: 'http://localhost:1234/v1',
        model: 'local-model',
      },
      revision: {
        horizonChapters: 20,
        autoCascade: false,
        previewImpact: true,
      },
      serial: {
        cycleLength: 5,
        cycleTensionTargets: [40, 60, 70, 80, 50],
        minimumBuffer: 5,
        releaseInterval: 2,
        enforceHookVariety: true,
        maxConsecutiveSameHook: 2,
      },
      extraction: {
        aggressiveness: 'moderate' as const,
        autoExtractTypes: ['character' as const, 'location' as const],
        suggestUpdates: true,
      },
      defaultChapterWordCount: 3000,
      autoSaveInterval: 120,
    };
    const result = ProjectSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });

  it('allows settings without serial (non-web-serial format)', () => {
    const settings = {
      llm: {
        endpoint: 'http://localhost:1234/v1',
        model: 'local-model',
      },
      revision: {},
      extraction: {},
    };
    const result = ProjectSettingsSchema.safeParse(settings);
    expect(result.success).toBe(true);
  });
});

describe('ProjectMetadataSchema', () => {
  it('validates complete metadata', () => {
    const metadata = {
      author: 'Jane Author',
      description: 'An epic fantasy saga',
      genres: ['fantasy', 'adventure'],
      audience: 'adult',
      estimatedWordCount: 150000,
      coverImage: '/covers/my-novel.jpg',
    };
    const result = ProjectMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });

  it('validates all audience values', () => {
    const audiences = ['general', 'young-adult', 'adult'] as const;
    for (const audience of audiences) {
      const metadata = { genres: [], audience };
      const result = ProjectMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    }
  });

  it('allows minimal metadata', () => {
    const metadata = { genres: [] };
    const result = ProjectMetadataSchema.safeParse(metadata);
    expect(result.success).toBe(true);
  });
});

describe('ProjectStatsSchema', () => {
  it('validates complete stats', () => {
    const stats = {
      totalWordCount: 50000,
      totalChapters: 20,
      chaptersByStatus: {
        draft: 5,
        review: 3,
        approved: 7,
        published: 5,
      },
      bibleStats: {
        characters: 15,
        locations: 10,
        factions: 3,
        worldRules: 8,
        plotThreads: 5,
        timelineEvents: 12,
      },
      unresolvedIssues: 3,
      calculatedAt: '2024-01-15T12:00:00Z',
    };
    const result = ProjectStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
  });
});

describe('ProjectSummarySchema', () => {
  it('validates a project summary', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'My Novel',
      format: 'web-serial' as const,
      wordCount: 50000,
      chapterCount: 20,
      lastModified: '2024-01-15T12:00:00Z',
      coverImage: '/covers/my-novel.jpg',
    };
    const result = ProjectSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it('allows summary without cover image', () => {
    const summary = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'My Novel',
      format: 'short' as const,
      wordCount: 15000,
      chapterCount: 5,
      lastModified: '2024-01-15T12:00:00Z',
    };
    const result = ProjectSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });
});

describe('DEFAULT_LLM_CONFIG', () => {
  it('is a valid LLM config', () => {
    const result = LlmConfigSchema.safeParse(DEFAULT_LLM_CONFIG);
    expect(result.success).toBe(true);
  });

  it('has expected default values', () => {
    expect(DEFAULT_LLM_CONFIG.endpoint).toBe('http://localhost:1234/v1');
    expect(DEFAULT_LLM_CONFIG.model).toBe('local-model');
    expect(DEFAULT_LLM_CONFIG.temperature).toBe(0.7);
    expect(DEFAULT_LLM_CONFIG.maxTokens).toBe(4096);
    expect(DEFAULT_LLM_CONFIG.contextWindow).toBe(128000);
  });
});

describe('createDefaultSettings', () => {
  it('creates settings without serial for short format', () => {
    const settings = createDefaultSettings('short');
    expect(settings.serial).toBeUndefined();
    expect(settings.llm).toBeDefined();
    expect(settings.revision).toBeDefined();
    expect(settings.extraction).toBeDefined();
  });

  it('creates settings without serial for light-novel format', () => {
    const settings = createDefaultSettings('light-novel');
    expect(settings.serial).toBeUndefined();
  });

  it('creates settings with serial for web-serial format', () => {
    const settings = createDefaultSettings('web-serial');
    expect(settings.serial).toBeDefined();
    expect(settings.serial?.cycleLength).toBe(5);
    expect(settings.serial?.cycleTensionTargets).toEqual([40, 60, 70, 80, 50]);
    expect(settings.serial?.minimumBuffer).toBe(5);
    expect(settings.serial?.releaseInterval).toBe(2);
    expect(settings.serial?.enforceHookVariety).toBe(true);
    expect(settings.serial?.maxConsecutiveSameHook).toBe(2);
  });

  it('creates valid settings for all formats', () => {
    const formats = ['short', 'light-novel', 'web-serial'] as const;
    for (const format of formats) {
      const settings = createDefaultSettings(format);
      const result = ProjectSettingsSchema.safeParse(settings);
      expect(result.success).toBe(true);
    }
  });
});
