import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CreateEntityDialog from './CreateEntityDialog.svelte';

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
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Character',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		expect(container.textContent).toContain('Create Character');
	});

	it('renders Cancel and Submit buttons', async () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		const cancelButton = container.querySelector('button.btn-secondary');
		expect(cancelButton).toBeTruthy();
		expect(cancelButton?.textContent).toContain('Cancel');
		// Submit button text matches title by default
		const submitButton = container.querySelector('button[type="submit"]');
		expect(submitButton?.textContent).toContain('Create Item');
	});

	it('uses custom submitLabel when provided', async () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
				submitLabel: 'Save Character',
			},
		});
		const submitButton = container.querySelector('button[type="submit"]');
		expect(submitButton?.textContent).toContain('Save Character');
		// Title still shows in dialog header
		expect(container.textContent).toContain('Create Item');
	});

	it('calls onClose when Cancel clicked', async () => {
		const handleClose = vi.fn();
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: handleClose,
				children: () => 'Form fields',
			},
		});
		const cancelButton = container.querySelector('button.btn-secondary') as HTMLButtonElement;
		cancelButton.click();
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
