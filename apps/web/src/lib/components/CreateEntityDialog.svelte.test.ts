import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CreateEntityDialog from './CreateEntityDialog.svelte';

// Note: CreateEntityDialog uses Svelte 5 snippets for children.
// vitest-browser-svelte has limitations with snippet props, so we focus
// on testing dialog structure and behavior rather than children content.

describe('CreateEntityDialog', () => {
	it('does not render when open is false', async () => {
		render(CreateEntityDialog, {
			props: {
				open: false,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	it('renders when open is true', async () => {
		render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Character',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		// Use heading role to get the title specifically (avoid button with same text)
		await expect.element(page.getByRole('heading', { name: 'Create Character' })).toBeVisible();
	});

	it('renders Cancel and Submit buttons', async () => {
		render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		// Check for Cancel button
		await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
		// Submit button text matches title by default
		await expect.element(page.getByRole('button', { name: 'Create Item' })).toBeVisible();
	});

	it('uses custom submitLabel when provided', async () => {
		render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
				submitLabel: 'Save Character',
			},
		});
		await expect.element(page.getByRole('button', { name: 'Save Character' })).toBeVisible();
		// Title still shows in dialog header
		await expect.element(page.getByText('Create Item')).toBeVisible();
	});

	it('calls onClose when Cancel clicked', async () => {
		const handleClose = vi.fn();
		render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: handleClose,
				children: () => 'Form fields',
			},
		});
		const cancelButton = page.getByRole('button', { name: 'Cancel' });
		await cancelButton.click();
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it('has dialog structure with cancel and submit buttons', async () => {
		render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		// Wait for dialog to render
		await expect.element(page.getByRole('dialog')).toBeVisible();
		// Check that both buttons are present
		await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'Create Item' })).toBeVisible();
	});

	it('has submit button that can be submitted', async () => {
		render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		// Wait for dialog to render
		await expect.element(page.getByRole('dialog')).toBeVisible();
		// Check submit button exists and has correct type
		const submitButton = page.getByRole('button', { name: 'Create Item' });
		await expect.element(submitButton).toBeVisible();
		await expect.element(submitButton).toHaveAttribute('type', 'submit');
	});
});
