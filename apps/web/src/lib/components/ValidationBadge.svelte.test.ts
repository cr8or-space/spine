import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ValidationBadge from './ValidationBadge.svelte';

describe('ValidationBadge', () => {
  describe('rendering', () => {
    it('should render nothing when all counts are zero', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 0,
          failCount: 0,
          warnCount: 0,
        },
      });
      expect(container.querySelector('.validation-badge')).toBeNull();
    });

    it('should render when showZero is true', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 0,
          failCount: 0,
          warnCount: 0,
          showZero: true,
        },
      });
      expect(container.querySelector('.validation-badge')).toBeTruthy();
    });

    it('should render pass count', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
          failCount: 0,
          warnCount: 0,
        },
      });
      const passCount = container.querySelector('.count-pass .value');
      expect(passCount?.textContent).toBe('5');
    });

    it('should render fail count', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 0,
          failCount: 3,
          warnCount: 0,
        },
      });
      const failCount = container.querySelector('.count-fail .value');
      expect(failCount?.textContent).toBe('3');
    });

    it('should render warn count', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 0,
          failCount: 0,
          warnCount: 2,
        },
      });
      const warnCount = container.querySelector('.count-warn .value');
      expect(warnCount?.textContent).toBe('2');
    });

    it('should render all counts when non-zero', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 10,
          failCount: 2,
          warnCount: 5,
        },
      });
      expect(container.querySelector('.count-pass .value')?.textContent).toBe('10');
      expect(container.querySelector('.count-fail .value')?.textContent).toBe('2');
      expect(container.querySelector('.count-warn .value')?.textContent).toBe('5');
    });
  });

  describe('status classes', () => {
    it('should have status-fail when failCount > 0', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 10,
          failCount: 1,
          warnCount: 0,
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('status-fail')).toBe(true);
    });

    it('should have status-warn when warnCount > 0 and failCount = 0', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 10,
          failCount: 0,
          warnCount: 1,
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('status-warn')).toBe(true);
    });

    it('should have status-pass when only passCount > 0', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 10,
          failCount: 0,
          warnCount: 0,
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('status-pass')).toBe(true);
    });

    it('should prioritize fail over warn', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 10,
          failCount: 1,
          warnCount: 5,
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('status-fail')).toBe(true);
      expect(badge?.classList.contains('status-warn')).toBe(false);
    });
  });

  describe('size variants', () => {
    it('should apply badge-md class by default', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('badge-md')).toBe(true);
    });

    it('should apply badge-sm class when size is sm', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
          size: 'sm',
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('badge-sm')).toBe(true);
    });
  });

  describe('interactivity', () => {
    it('should have interactive class when onclick is provided', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
          onclick: () => {},
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('interactive')).toBe(true);
    });

    it('should not have interactive class when onclick is not provided', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.classList.contains('interactive')).toBe(false);
    });

    it('should call onclick when clicked', async () => {
      const handleClick = vi.fn();
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
          onclick: handleClick,
        },
      });
      const badge = container.querySelector('.validation-badge') as HTMLButtonElement;
      badge?.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when onclick is not provided', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
        },
      });
      const badge = container.querySelector('.validation-badge') as HTMLButtonElement;
      expect(badge?.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have aria-label describing status', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 10,
          failCount: 2,
          warnCount: 5,
        },
      });
      const badge = container.querySelector('.validation-badge');
      expect(badge?.getAttribute('aria-label')).toBe(
        'Validation status: 10 passed, 2 failed, 5 warnings'
      );
    });

    it('should have aria-label on individual counts', () => {
      const { container } = render(ValidationBadge, {
        props: {
          passCount: 5,
          failCount: 3,
          warnCount: 1,
        },
      });
      expect(
        container.querySelector('.count-pass')?.getAttribute('aria-label')
      ).toBe('5 passed');
      expect(
        container.querySelector('.count-fail')?.getAttribute('aria-label')
      ).toBe('3 failed');
      expect(
        container.querySelector('.count-warn')?.getAttribute('aria-label')
      ).toBe('1 warnings');
    });
  });
});
