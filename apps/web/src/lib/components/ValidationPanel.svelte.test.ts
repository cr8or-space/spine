import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
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
		it('should render panel with title', async () => {
			render(ValidationPanel, {
				props: {
					results: mockResults,
					title: 'Custom Title',
				},
			});
			const title = page.getByRole('heading', { name: 'Custom Title' });
			await expect.element(title).toBeVisible();
		});

		it('should render default title', async () => {
			render(ValidationPanel, {
				props: {
					results: mockResults,
				},
			});
			const title = page.getByRole('heading', { name: 'Validation Results' });
			await expect.element(title).toBeVisible();
		});

		it('should show empty state when no results', async () => {
			render(ValidationPanel, {
				props: {
					results: [],
				},
			});
			await expect.element(page.getByText('No validation results to display.')).toBeVisible();
		});

		it('should render validation results', async () => {
			render(ValidationPanel, {
				props: {
					results: mockResults,
				},
			});
			// Should render at least one result message
			await expect.element(page.getByText('All required fields present')).toBeVisible();
		});

		it('should display result messages', async () => {
			render(ValidationPanel, {
				props: {
					results: [{ status: 'fail', message: 'Test message' }],
				},
			});
			await expect.element(page.getByText('Test message')).toBeVisible();
		});
	});

	describe('status indicators', () => {
		it('should show pass icon for passing results', async () => {
			render(ValidationPanel, {
				props: {
					results: [{ status: 'pass', message: 'Passed' }],
				},
			});
			// The pass icon is ✓ with aria-label="pass" - use list item context to avoid badge matches
			const listItem = page.getByRole('listitem');
			await expect.element(listItem.getByLabelText('pass')).toBeVisible();
			await expect.element(listItem.getByLabelText('pass')).toHaveTextContent('✓');
		});

		it('should show fail icon for failing results', async () => {
			render(ValidationPanel, {
				props: {
					results: [{ status: 'fail', message: 'Failed' }],
				},
			});
			const listItem = page.getByRole('listitem');
			await expect.element(listItem.getByLabelText('fail')).toBeVisible();
			await expect.element(listItem.getByLabelText('fail')).toHaveTextContent('✕');
		});

		it('should show warn icon for warning results', async () => {
			render(ValidationPanel, {
				props: {
					results: [{ status: 'warn', message: 'Warning' }],
				},
			});
			const listItem = page.getByRole('listitem');
			await expect.element(listItem.getByLabelText('warn')).toBeVisible();
			await expect.element(listItem.getByLabelText('warn')).toHaveTextContent('!');
		});
	});

	describe('location links', () => {
		it('should show location link when result has location', async () => {
			render(ValidationPanel, {
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
			await expect.element(page.getByRole('button', { name: /test-node/i })).toBeVisible();
		});

		it('should call onNavigate when location is clicked', async () => {
			const handleNavigate = vi.fn();
			const location = { nodeId: 'test-node', order: 0 };

			render(ValidationPanel, {
				props: {
					results: [{ status: 'fail', message: 'Test', location }],
					onNavigate: handleNavigate,
				},
			});

			const locationBtn = page.getByRole('button', { name: /test-node/i });
			await locationBtn.click();

			expect(handleNavigate).toHaveBeenCalledWith(location);
		});

		it('should disable location link when onNavigate is not provided', async () => {
			render(ValidationPanel, {
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
			const locationBtn = page.getByRole('button', { name: /test-node/i });
			await expect.element(locationBtn).toBeDisabled();
		});
	});

	describe('fix suggestions', () => {
		it('should show fix suggestion when available', async () => {
			render(ValidationPanel, {
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
			await expect.element(page.getByText('Suggested fix:')).toBeVisible();
			await expect.element(page.getByText('Do this to fix it')).toBeVisible();
		});

		it('should not show fix suggestion when not available', async () => {
			render(ValidationPanel, {
				props: {
					results: [{ status: 'fail', message: 'Test' }],
				},
			});
			await expect.element(page.getByText('Suggested fix:')).not.toBeInTheDocument();
		});
	});

	describe('collapsible phases', () => {
		it('should have expandable header when collapsible is true', async () => {
			render(ValidationPanel, {
				props: {
					results: mockResults,
					collapsible: true,
				},
			});
			// Phase headers are buttons with aria-expanded
			const phaseHeader = page.getByRole('button', { name: /Structural|Automated/i }).first();
			await expect.element(phaseHeader).toHaveAttribute('aria-expanded', 'true');
		});

		it('should not be expandable when collapsible is false', async () => {
			render(ValidationPanel, {
				props: {
					results: mockResults,
					collapsible: false,
				},
			});
			// Phase headers should be disabled when not collapsible
			const phaseHeader = page.getByRole('button', { name: /Structural|Automated/i }).first();
			await expect.element(phaseHeader).toBeDisabled();
		});

		it('should respect initiallyCollapsed prop', async () => {
			render(ValidationPanel, {
				props: {
					results: [{ status: 'fail', message: 'Test failure message' }],
					collapsible: true,
					initiallyCollapsed: ['structural'],
				},
			});

			// When initially collapsed, list should not be present
			const list = page.getByRole('list');
			await expect.element(list).not.toBeInTheDocument();

			// Phase header should show collapsed state
			const phaseHeader = page.getByRole('button', { name: /Structural/i }).first();
			await expect.element(phaseHeader).toHaveAttribute('aria-expanded', 'false');
		});
	});

	describe('summary badge', () => {
		it('should show summary badge in header', async () => {
			render(ValidationPanel, {
				props: {
					results: mockResults,
				},
			});
			// The summary badge has an aria-label describing the status
			const badge = page.getByRole('button', { name: /Validation status:/i }).first();
			await expect.element(badge).toBeVisible();
		});

		it('should show correct counts in badges', async () => {
			render(ValidationPanel, {
				props: {
					results: [
						{ status: 'pass', message: 'Pass 1' },
						{ status: 'pass', message: 'Pass 2' },
						{ status: 'fail', message: 'Fail 1' },
						{ status: 'warn', message: 'Warn 1' },
					],
				},
			});
			// Badge should show counts - look for the aria-label, use .first() to get header badge
			const badge = page
				.getByRole('button', { name: /2 passed.*1 failed.*1 warnings/i })
				.first();
			await expect.element(badge).toBeVisible();
		});
	});
});
