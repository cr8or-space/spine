import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import Dialog from './Dialog.svelte';

// Note: Dialog uses Svelte 5 snippets for children.
// vitest-browser-svelte has limitations with snippet props, so we focus
// on testing dialog structure and behavior rather than children content.

describe('Dialog', () => {
	it('does not render when open is false', async () => {
		const { container } = render(Dialog, {
			props: {
				open: false,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		const backdrop = container.querySelector('.dialog-backdrop');
		expect(backdrop).toBeFalsy();
	});

	it('renders when open is true', async () => {
		render(Dialog, {
			props: {
				open: true,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		const title = page.getByRole('heading', { name: 'Test Dialog' });
		await expect.element(title).toBeInTheDocument();
	});

	it('calls onClose when close button is clicked', async () => {
		const handleClose = vi.fn();
		render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: handleClose,
				children: () => 'Content',
			},
		});

		const closeButton = page.getByRole('button', { name: 'Close dialog' });
		await expect.element(closeButton).toBeInTheDocument();
		await userEvent.click(closeButton);
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it('has correct ARIA attributes', async () => {
		const { container } = render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: () => {},
				children: () => 'Content',
			},
		});

		const dialog = container.querySelector('[role="dialog"]');
		expect(dialog).toBeTruthy();
		expect(dialog?.getAttribute('aria-modal')).toBe('true');
		expect(dialog?.getAttribute('aria-labelledby')).toBe('dialog-title');
	});

	it('closes when escape key is pressed', async () => {
		const handleClose = vi.fn();
		render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: handleClose,
				children: () => 'Content',
			},
		});

		await userEvent.keyboard('{Escape}');
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it('closes when backdrop is clicked', async () => {
		const handleClose = vi.fn();
		const { container } = render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: handleClose,
				children: () => 'Content',
			},
		});

		const backdrop = container.querySelector('.dialog-backdrop') as HTMLElement;
		expect(backdrop).toBeTruthy();
		// Click the backdrop directly (not on dialog)
		backdrop.click();
		expect(handleClose).toHaveBeenCalledOnce();
	});
});
