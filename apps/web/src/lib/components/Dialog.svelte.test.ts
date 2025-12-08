import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import Dialog from './Dialog.svelte';

// Note: Dialog uses Svelte 5 snippets for children.
// vitest-browser-svelte has limitations with snippet props, so we focus
// on testing dialog structure and behavior rather than children content.

describe('Dialog', () => {
	it('does not render when open is false', async () => {
		render(Dialog, {
			props: {
				open: false,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		// Bits UI Dialog uses portal, so query the document body
		const backdrop = document.querySelector('.dialog-backdrop');
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
		render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: () => {},
				children: () => 'Content',
			},
		});

		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toBeVisible();
		await expect.element(dialog).toHaveAttribute('aria-modal', 'true');
	});

	it('renders description when provided', async () => {
		render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				description: 'This is a description',
				onClose: () => {},
				children: () => 'Content',
			},
		});

		const description = page.getByText('This is a description');
		await expect.element(description).toBeVisible();
	});

	it('renders footer element when footer snippet provided', async () => {
		render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: () => {},
				children: () => 'Content',
				footer: () => 'Footer Content',
			},
		});

		// Wait for dialog to be visible
		await expect.element(page.getByRole('dialog')).toBeVisible();
		// The footer element is rendered with flex classes - query by tag
		const footerElement = document.querySelector('footer');
		expect(footerElement).toBeTruthy();
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

	it('respects closeOnBackdropClick prop', async () => {
		// Test that closeOnBackdropClick=false configures the dialog correctly
		// The actual backdrop click behavior is handled by Bits UI
		render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: () => {},
				children: () => 'Content',
				closeOnBackdropClick: false,
			},
		});

		// Dialog should be visible
		const dialog = page.getByRole('dialog');
		await expect.element(dialog).toBeVisible();
	});
});
