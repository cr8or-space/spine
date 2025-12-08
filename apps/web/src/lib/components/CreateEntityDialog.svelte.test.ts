import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import CreateEntityDialog from './CreateEntityDialog.svelte';

// Note: CreateEntityDialog uses Svelte 5 snippets for children.
// vitest-browser-svelte has limitations with snippet props, so we focus
// on testing dialog structure and behavior rather than children content.

describe('CreateEntityDialog', () => {
	it('does not render when open is false', async () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: false,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		const backdrop = container.querySelector('.dialog-backdrop');
		expect(backdrop).toBeFalsy();
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
		const title = page.getByRole('heading', { name: 'Create Character' });
		await expect.element(title).toBeInTheDocument();
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
		const cancelButton = page.getByRole('button', { name: 'Cancel' });
		await expect.element(cancelButton).toBeInTheDocument();

		// Submit button text matches title by default
		const submitButton = page.getByRole('button', { name: 'Create Item' });
		await expect.element(submitButton).toBeInTheDocument();
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
		const submitButton = page.getByRole('button', { name: 'Save Character' });
		await expect.element(submitButton).toBeInTheDocument();

		// Title still shows in dialog header
		const title = page.getByRole('heading', { name: 'Create Item' });
		await expect.element(title).toBeInTheDocument();
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
		await userEvent.click(cancelButton);
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it('has dialog-form and dialog-actions structure', async () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		expect(container.querySelector('.dialog-form')).toBeTruthy();
		expect(container.querySelector('.dialog-actions')).toBeTruthy();
	});

	it('has submit button inside dialog-actions', async () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		const actions = container.querySelector('.dialog-actions');
		expect(actions).toBeTruthy();
		const submitButton = actions?.querySelector('button[type="submit"]');
		expect(submitButton).toBeTruthy();
	});
});
