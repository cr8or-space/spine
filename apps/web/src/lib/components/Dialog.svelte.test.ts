import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Dialog from './Dialog.svelte';

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
		// Bits UI Dialog uses portal, so use page locators
		const title = page.getByText('Test Dialog');
		await expect.element(title).toBeVisible();
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
		await expect.element(closeButton).toBeVisible();
		await closeButton.click();
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
});
