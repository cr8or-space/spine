import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
	it('renders with default classes', () => {
		const { container } = render(Button, {
			props: {
				children: () => 'Click me',
			},
		});
		const button = container.querySelector('button');
		expect(button).toBeTruthy();
		expect(button?.classList.contains('btn')).toBe(true);
		expect(button?.classList.contains('btn-primary')).toBe(true);
		expect(button?.classList.contains('btn-md')).toBe(true);
	});

	it('renders with custom variant', () => {
		const { container } = render(Button, {
			props: {
				variant: 'secondary',
				children: () => 'Button',
			},
		});
		const button = container.querySelector('button');
		expect(button?.classList.contains('btn-secondary')).toBe(true);
	});

	it('renders with custom size', () => {
		const { container } = render(Button, {
			props: {
				size: 'sm',
				children: () => 'Small',
			},
		});
		const button = container.querySelector('button');
		expect(button?.classList.contains('btn-sm')).toBe(true);
	});

	it('can be disabled', () => {
		const { container } = render(Button, {
			props: {
				disabled: true,
				children: () => 'Disabled',
			},
		});
		const button = container.querySelector('button');
		expect(button?.disabled).toBe(true);
	});

	it('shows loading state', () => {
		const { container } = render(Button, {
			props: {
				loading: true,
				children: () => 'Loading',
			},
		});
		const button = container.querySelector('button');
		expect(button?.disabled).toBe(true);
		expect(container.querySelector('.spinner')).toBeTruthy();
	});
});
