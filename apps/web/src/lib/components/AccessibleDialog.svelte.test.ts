import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AccessibleDialog from './AccessibleDialog.svelte';

describe('AccessibleDialog', () => {
	it('does not render content when open is false', async () => {
		const { container } = render(AccessibleDialog, {
			props: {
				open: false,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		// When closed, the dialog content should not be visible
		const title = container.querySelector('.dialog-title');
		expect(title).toBeFalsy();
	});

	it('renders when open is true', async () => {
		render(AccessibleDialog, {
			props: {
				open: true,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		// Wait for portal to render
		await new Promise((resolve) => setTimeout(resolve, 50));

		// Check body for portaled content
		const title = document.querySelector('.dialog-title');
		expect(title).toBeTruthy();
		expect(title?.textContent).toBe('Test Dialog');
	});

	it('calls onClose when close button is clicked', async () => {
		const handleClose = vi.fn();
		render(AccessibleDialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: handleClose,
				children: () => 'Content',
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		const closeButton = document.querySelector('.dialog-close') as HTMLButtonElement;
		expect(closeButton).toBeTruthy();
		closeButton.click();

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it('has proper ARIA attributes', async () => {
		render(AccessibleDialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: () => {},
				children: () => 'Content',
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		// Bits UI Dialog uses role="dialog" and aria-modal
		const dialog = document.querySelector('[role="dialog"]');
		expect(dialog).toBeTruthy();
		expect(dialog?.getAttribute('aria-modal')).toBe('true');
	});

	it('renders description when provided', async () => {
		render(AccessibleDialog, {
			props: {
				open: true,
				title: 'Test',
				description: 'This is a description',
				onClose: () => {},
				children: () => 'Content',
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		const description = document.querySelector('.dialog-description');
		expect(description).toBeTruthy();
		expect(description?.textContent).toBe('This is a description');
	});

	it('renders footer container when provided', async () => {
		render(AccessibleDialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: () => {},
				children: () => 'Content',
				footer: () => 'Footer content',
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 50));

		// Footer container should be rendered when footer snippet is provided
		const footer = document.querySelector('.dialog-footer');
		expect(footer).toBeTruthy();
	});
});
