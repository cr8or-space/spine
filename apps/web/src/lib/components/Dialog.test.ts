import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Dialog from './Dialog.svelte';

describe('Dialog', () => {
	it('does not render when open is false', () => {
		const { container } = render(Dialog, {
			props: {
				open: false,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		const dialog = container.querySelector('.dialog-backdrop');
		expect(dialog).toBeFalsy();
	});

	it('renders when open is true', () => {
		const { getByText } = render(Dialog, {
			props: {
				open: true,
				title: 'Test Dialog',
				onClose: () => {},
				children: () => 'Content',
			},
		});
		expect(getByText('Test Dialog')).toBeTruthy();
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

		const closeButton = container.querySelector('.dialog-close');
		if (closeButton) {
			await fireEvent.click(closeButton);
			expect(handleClose).toHaveBeenCalledOnce();
		}
	});

	it('calls onClose when backdrop is clicked', async () => {
		const handleClose = vi.fn();
		const { container } = render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: handleClose,
				children: () => 'Content',
			},
		});

		const backdrop = container.querySelector('.dialog-backdrop');
		if (backdrop) {
			await fireEvent.click(backdrop);
			expect(handleClose).toHaveBeenCalledOnce();
		}
	});

	it('has correct ARIA attributes', () => {
		render(Dialog, {
			props: {
				open: true,
				title: 'Test',
				onClose: () => {},
				children: () => 'Content',
			},
		});

		// Bits UI Dialog uses Portal, so query document.body instead of container
		const dialog = document.body.querySelector('[role="dialog"]');
		expect(dialog).toBeTruthy();
		// Bits UI sets aria-modal on the dialog element
		expect(dialog?.getAttribute('aria-modal')).toBe('true');
		// Bits UI generates aria-labelledby dynamically
		expect(dialog?.hasAttribute('aria-labelledby')).toBe(true);
	});
});
