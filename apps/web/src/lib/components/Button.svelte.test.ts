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
		expect(button?.classList.contains('btn')).toBe(true);
		expect(button?.classList.contains('btn-primary')).toBe(true);
		expect(button?.classList.contains('btn-md')).toBe(true);
	});

	it('renders with secondary variant', async () => {
		const { container } = render(Button, {
			props: {
				variant: 'secondary',
				children: () => 'Secondary',
			},
		});
		const button = container.querySelector('button');
		expect(button?.classList.contains('btn-secondary')).toBe(true);
	});

	it('renders with danger variant', async () => {
		const { container } = render(Button, {
			props: {
				variant: 'danger',
				children: () => 'Danger',
			},
		});
		const button = container.querySelector('button');
		expect(button?.classList.contains('btn-danger')).toBe(true);
	});

	it('renders with ghost variant', async () => {
		const { container } = render(Button, {
			props: {
				variant: 'ghost',
				children: () => 'Ghost',
			},
		});
		const button = container.querySelector('button');
		expect(button?.classList.contains('btn-ghost')).toBe(true);
	});

	it('renders with small size', async () => {
		const { container } = render(Button, {
			props: {
				size: 'sm',
				children: () => 'Small',
			},
		});
		const button = container.querySelector('button');
		expect(button?.classList.contains('btn-sm')).toBe(true);
	});

	it('renders with large size', async () => {
		const { container } = render(Button, {
			props: {
				size: 'lg',
				children: () => 'Large',
			},
		});
		const button = container.querySelector('button');
		expect(button?.classList.contains('btn-lg')).toBe(true);
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
		expect(container.querySelector('.spinner')).toBeTruthy();
	});
});
