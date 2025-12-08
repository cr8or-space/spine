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
		// Default variant is primary with bg-primary
		expect(button?.classList.contains('bg-primary')).toBe(true);
	});

	it('renders with custom variant', () => {
		const { container } = render(Button, {
			props: {
				variant: 'secondary',
				children: () => 'Button',
			},
		});
		const button = container.querySelector('button');
		// Secondary variant has bg-bg-secondary
		expect(button?.classList.contains('bg-bg-secondary')).toBe(true);
	});

	it('renders with custom size', () => {
		const { container } = render(Button, {
			props: {
				size: 'sm',
				children: () => 'Small',
			},
		});
		const button = container.querySelector('button');
		// Small size has h-8
		expect(button?.classList.contains('h-8')).toBe(true);
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
		// Loading spinner has animate-spin class
		expect(container.querySelector('.animate-spin')).toBeTruthy();
	});
});
