import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ValidationPanel from './ValidationPanel.svelte';
import type { ValidationResult } from '@spine/types';

describe('ValidationPanel', () => {
  const mockResults: ValidationResult[] = [
    {
      status: 'pass',
      message: 'All required fields present',
    },
    {
      status: 'fail',
      message: 'Character name is too short',
      location: { nodeId: 'chapter-1', order: 0 },
      fix: 'Use a name with at least 2 characters',
    },
    {
      status: 'warn',
      message: 'Description could be more detailed',
      location: { nodeId: 'chapter-2', order: 1 },
    },
    {
      status: 'pass',
      message: 'Timeline consistency verified',
      location: { nodeId: 'chapter-3', order: 2 },
    },
  ];

  describe('rendering', () => {
    it('should render panel with title', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: mockResults,
          title: 'Custom Title',
        },
      });
      const title = container.querySelector('.panel-title');
      expect(title?.textContent).toBe('Custom Title');
    });

    it('should render default title', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: mockResults,
        },
      });
      const title = container.querySelector('.panel-title');
      expect(title?.textContent).toBe('Validation Results');
    });

    it('should show empty state when no results', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [],
        },
      });
      const emptyState = container.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState?.textContent).toContain('No validation results');
    });

    it('should render validation results', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: mockResults,
        },
      });
      const resultItems = container.querySelectorAll('.result-item');
      expect(resultItems.length).toBeGreaterThan(0);
    });

    it('should display result messages', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [{ status: 'fail', message: 'Test message' }],
        },
      });
      const message = container.querySelector('.result-message');
      expect(message?.textContent).toBe('Test message');
    });
  });

  describe('status indicators', () => {
    it('should show pass icon for passing results', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [{ status: 'pass', message: 'Passed' }],
        },
      });
      const icon = container.querySelector('.status-icon.status-pass');
      expect(icon?.textContent).toBe('✓');
    });

    it('should show fail icon for failing results', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [{ status: 'fail', message: 'Failed' }],
        },
      });
      const icon = container.querySelector('.status-icon.status-fail');
      expect(icon?.textContent).toBe('✕');
    });

    it('should show warn icon for warning results', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [{ status: 'warn', message: 'Warning' }],
        },
      });
      const icon = container.querySelector('.status-icon.status-warn');
      expect(icon?.textContent).toBe('!');
    });
  });

  describe('location links', () => {
    it('should show location link when result has location', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [
            {
              status: 'fail',
              message: 'Test',
              location: { nodeId: 'test-node', order: 0 },
            },
          ],
        },
      });
      const locationLink = container.querySelector('.location-link');
      expect(locationLink).toBeTruthy();
      expect(locationLink?.textContent).toContain('test-node');
    });

    it('should call onNavigate when location is clicked', async () => {
      const handleNavigate = vi.fn();
      const location = { nodeId: 'test-node', order: 0 };

      const { container } = render(ValidationPanel, {
        props: {
          results: [{ status: 'fail', message: 'Test', location }],
          onNavigate: handleNavigate,
        },
      });

      const locationLink = container.querySelector('.location-link') as HTMLButtonElement;
      locationLink?.click();

      expect(handleNavigate).toHaveBeenCalledWith(location);
    });

    it('should disable location link when onNavigate is not provided', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [
            {
              status: 'fail',
              message: 'Test',
              location: { nodeId: 'test-node', order: 0 },
            },
          ],
        },
      });
      const locationLink = container.querySelector('.location-link') as HTMLButtonElement;
      expect(locationLink?.disabled).toBe(true);
    });
  });

  describe('fix suggestions', () => {
    it('should show fix suggestion when available', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [
            {
              status: 'fail',
              message: 'Test',
              fix: 'Do this to fix it',
            },
          ],
        },
      });
      const fixSuggestion = container.querySelector('.fix-suggestion');
      expect(fixSuggestion).toBeTruthy();
      expect(fixSuggestion?.textContent).toContain('Do this to fix it');
    });

    it('should not show fix suggestion when not available', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [{ status: 'fail', message: 'Test' }],
        },
      });
      const fixSuggestion = container.querySelector('.fix-suggestion');
      expect(fixSuggestion).toBeNull();
    });
  });

  describe('collapsible phases', () => {
    it('should have collapsible class when collapsible is true', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: mockResults,
          collapsible: true,
        },
      });
      const phaseHeader = container.querySelector('.phase-header');
      expect(phaseHeader?.classList.contains('collapsible')).toBe(true);
    });

    it('should not have collapsible class when collapsible is false', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: mockResults,
          collapsible: false,
        },
      });
      const phaseHeader = container.querySelector('.phase-header');
      expect(phaseHeader?.classList.contains('collapsible')).toBe(false);
    });

    it('should toggle phase visibility when header is clicked', async () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: [{ status: 'fail', message: 'Test' }],
          collapsible: true,
        },
      });

      // Initially expanded
      let resultList = container.querySelector('.result-list');
      expect(resultList).toBeTruthy();

      // Click to collapse
      const phaseHeader = container.querySelector('.phase-header') as HTMLButtonElement;
      phaseHeader?.click();

      // Wait for Svelte to update
      await new Promise((r) => setTimeout(r, 0));

      resultList = container.querySelector('.result-list');
      expect(resultList).toBeNull();
    });
  });

  describe('summary badge', () => {
    it('should show summary badge in header', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: mockResults,
        },
      });
      const headerBadge = container.querySelector('.panel-header .validation-badge');
      expect(headerBadge).toBeTruthy();
    });

    it('should show phase badges', () => {
      const { container } = render(ValidationPanel, {
        props: {
          results: mockResults,
        },
      });
      const phaseBadges = container.querySelectorAll('.phase-header .validation-badge');
      expect(phaseBadges.length).toBeGreaterThan(0);
    });
  });
});
