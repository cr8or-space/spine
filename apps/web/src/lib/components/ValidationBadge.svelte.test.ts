import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ValidationBadge from './ValidationBadge.svelte';

describe('ValidationBadge', () => {
	describe('rendering', () => {
		it('should render nothing when all counts are zero', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 0,
					failCount: 0,
					warnCount: 0,
				},
			});
			await expect.element(page.getByRole('button')).not.toBeInTheDocument();
		});

		it('should render when showZero is true', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 0,
					failCount: 0,
					warnCount: 0,
					showZero: true,
				},
			});
			await expect.element(page.getByRole('button')).toBeVisible();
		});

		it('should render pass count', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 5,
					failCount: 0,
					warnCount: 0,
				},
			});
			await expect.element(page.getByLabelText('5 passed', { exact: true })).toBeVisible();
		});

		it('should render fail count', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 0,
					failCount: 3,
					warnCount: 0,
				},
			});
			await expect.element(page.getByLabelText('3 failed', { exact: true })).toBeVisible();
		});

		it('should render warn count', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 0,
					failCount: 0,
					warnCount: 2,
				},
			});
			await expect.element(page.getByLabelText('2 warnings', { exact: true })).toBeVisible();
		});

		it('should render all counts when non-zero', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 10,
					failCount: 2,
					warnCount: 5,
				},
			});
			await expect.element(page.getByLabelText('10 passed', { exact: true })).toBeVisible();
			await expect.element(page.getByLabelText('2 failed', { exact: true })).toBeVisible();
			await expect.element(page.getByLabelText('5 warnings', { exact: true })).toBeVisible();
		});
	});

	describe('status classes', () => {
		it('should have danger border when failCount > 0', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 10,
					failCount: 1,
					warnCount: 0,
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toHaveClass(/border-danger/);
		});

		it('should have warning border when warnCount > 0 and failCount = 0', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 10,
					failCount: 0,
					warnCount: 1,
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toHaveClass(/border-warning/);
		});

		it('should have success border when only passCount > 0', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 10,
					failCount: 0,
					warnCount: 0,
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toHaveClass(/border-success/);
		});

		it('should prioritize fail over warn', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 10,
					failCount: 1,
					warnCount: 5,
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toHaveClass(/border-danger/);
		});
	});

	describe('size variants', () => {
		it('should apply text-sm class by default (md size)', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 5,
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toHaveClass(/text-sm/);
		});

		it('should apply text-xs class when size is sm', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 5,
					size: 'sm',
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toHaveClass(/text-xs/);
		});
	});

	describe('interactivity', () => {
		it('should have cursor-pointer when onclick is provided', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 5,
					onclick: () => {},
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toHaveClass(/cursor-pointer/);
		});

		it('should not be disabled when onclick is provided', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 5,
					onclick: () => {},
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).not.toBeDisabled();
		});

		it('should call onclick when clicked', async () => {
			const handleClick = vi.fn();
			render(ValidationBadge, {
				props: {
					passCount: 5,
					onclick: handleClick,
				},
			});
			const badge = page.getByRole('button');
			await badge.click();
			expect(handleClick).toHaveBeenCalledTimes(1);
		});

		it('should be disabled when onclick is not provided', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 5,
				},
			});
			const badge = page.getByRole('button');
			await expect.element(badge).toBeDisabled();
		});
	});

	describe('accessibility', () => {
		it('should have aria-label describing status', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 10,
					failCount: 2,
					warnCount: 5,
				},
			});
			const badge = page.getByRole('button', {
				name: 'Validation status: 10 passed, 2 failed, 5 warnings',
			});
			await expect.element(badge).toBeVisible();
		});

		it('should have aria-label on individual counts', async () => {
			render(ValidationBadge, {
				props: {
					passCount: 5,
					failCount: 3,
					warnCount: 1,
				},
			});
			await expect.element(page.getByLabelText('5 passed', { exact: true })).toBeVisible();
			await expect.element(page.getByLabelText('3 failed', { exact: true })).toBeVisible();
			await expect.element(page.getByLabelText('1 warnings', { exact: true })).toBeVisible();
		});
	});
});
