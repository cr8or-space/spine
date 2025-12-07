import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CreateEntityDialog from './CreateEntityDialog.svelte';

describe('CreateEntityDialog', () => {
	it('does not render when open is false', () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: false,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		const dialog = container.querySelector('.dialog-backdrop');
		expect(dialog).toBeFalsy();
	});

	it('renders when open is true', () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Character',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		// Check for dialog title in header
		const dialogTitle = container.querySelector('#dialog-title');
		expect(dialogTitle?.textContent).toBe('Create Character');
	});

	it('renders Cancel and Submit buttons', () => {
		const { getByText, container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Form fields',
			},
		});
		expect(getByText('Cancel')).toBeTruthy();
		// Submit button text matches title by default
		const submitButton = container.querySelector('button[type="submit"]');
		expect(submitButton?.textContent).toContain('Create Item');
	});

	it('uses custom submitLabel when provided', () => {
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
		const dialogTitle = container.querySelector('#dialog-title');
		expect(dialogTitle?.textContent).toBe('Create Item');
	});

	it('calls onClose when Cancel clicked', async () => {
		const handleClose = vi.fn();
		const { getByText } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: handleClose,
				children: () => 'Form fields',
			},
		});
		await fireEvent.click(getByText('Cancel'));
		expect(handleClose).toHaveBeenCalledOnce();
	});

	it('has dialog-form and dialog-actions structure', () => {
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

	it('has submit button inside dialog-actions', () => {
		const { container } = render(CreateEntityDialog, {
			props: {
				open: true,
				title: 'Create Item',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		const actions = container.querySelector('.dialog-actions');
		const submitButton = actions?.querySelector('button[type="submit"]');
		expect(submitButton).toBeTruthy();
	});
});
