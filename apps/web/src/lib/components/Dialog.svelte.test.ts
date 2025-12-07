import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Dialog from './Dialog.svelte';

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
		const { container } = render(Dialog, {
			props: {
				open: true,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		const title = container.querySelector('.dialog-title');
		expect(title).toBeTruthy();
		expect(title?.textContent).toBe('Test Dialog');
	});

	it('calls onClose when close button is clicked', async () => {
		const handleClose = vi.fn();
		const { container } = render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: handleClose,
				children: () => 'Content',
			},
		});

		const closeButton = container.querySelector('.dialog-close') as HTMLButtonElement;
		expect(closeButton).toBeTruthy();
		closeButton.click();
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
});
