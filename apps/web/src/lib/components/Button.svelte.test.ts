import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Button from './Button.svelte';

// Note: Button uses Svelte 5 snippets for children.
// vitest-browser-svelte has limitations with snippet props, so we test
// using container queries for class-based assertions.

describe('Button', () => {
	it('renders with default classes', async () => {
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

	it('renders with secondary variant', async () => {
		const { container } = render(Button, {
			props: {
				variant: 'secondary',
				children: () => 'Secondary',
			},
		});
		const button = container.querySelector('button');
		// Secondary variant has bg-bg-secondary
		expect(button?.classList.contains('bg-bg-secondary')).toBe(true);
	});

	it('renders with danger variant', async () => {
		const { container } = render(Button, {
			props: {
				variant: 'danger',
				children: () => 'Danger',
			},
		});
		const button = container.querySelector('button');
		// Danger variant has bg-danger
		expect(button?.classList.contains('bg-danger')).toBe(true);
	});

	it('renders with ghost variant', async () => {
		const { container } = render(Button, {
			props: {
				variant: 'ghost',
				children: () => 'Ghost',
			},
		});
		const button = container.querySelector('button');
		// Ghost variant has bg-transparent
		expect(button?.classList.contains('bg-transparent')).toBe(true);
	});

	it('renders with small size', async () => {
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

	it('renders with large size', async () => {
		const { container } = render(Button, {
			props: {
				size: 'lg',
				children: () => 'Large',
			},
		});
		const button = container.querySelector('button');
		// Large size has h-12
		expect(button?.classList.contains('h-12')).toBe(true);
	});

	it('can be disabled', async () => {
		const { container } = render(Button, {
			props: {
				disabled: true,
				children: () => 'Disabled',
			},
		});
		const button = container.querySelector('button') as HTMLButtonElement;
		expect(button?.disabled).toBe(true);
	});

	it('shows loading state', async () => {
		const { container } = render(Button, {
			props: {
				loading: true,
				children: () => 'Loading',
			},
		});
		const button = container.querySelector('button') as HTMLButtonElement;
		expect(button?.disabled).toBe(true);
		// Loading spinner has animate-spin class
		expect(container.querySelector('.animate-spin')).toBeTruthy();
	});
});
