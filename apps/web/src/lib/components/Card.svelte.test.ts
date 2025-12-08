import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Card from './Card.svelte';

// Note: Card uses Svelte 5 snippets for children.
// vitest-browser-svelte has limitations with snippet props, so we focus
// on testing card structure and classes rather than children content.

describe('Card', () => {
	it('renders with default props', async () => {
		const { container } = render(Card, {
			props: {
				children: () => 'Card content',
			},
		});
		// Card has bg-surface border border-border rounded-lg classes
		const card = container.querySelector('.bg-surface');
		expect(card).toBeTruthy();
		// Default padding is md which is p-4
		expect(card?.classList.contains('p-4')).toBe(true);
	});

	it('applies hover class when hover prop is true', async () => {
		const { container } = render(Card, {
			props: {
				hover: true,
				children: () => 'Hoverable card',
			},
		});
		const card = container.querySelector('.cursor-pointer');
		expect(card).toBeTruthy();
	});

	it('applies small padding class when padding is "sm"', async () => {
		const { container } = render(Card, {
			props: {
				padding: 'sm',
				children: () => 'Small padding',
			},
		});
		// Small padding is p-3
		const card = container.querySelector('.p-3');
		expect(card).toBeTruthy();
	});

	it('applies large padding class when padding is "lg"', async () => {
		const { container } = render(Card, {
			props: {
				padding: 'lg',
				children: () => 'Large padding',
			},
		});
		// Large padding is p-6
		const card = container.querySelector('.p-6');
		expect(card).toBeTruthy();
	});

	it('applies no padding class when padding is "none"', async () => {
		const { container } = render(Card, {
			props: {
				padding: 'none',
				children: () => 'No padding',
			},
		});
		const card = container.querySelector('.p-0');
		expect(card).toBeTruthy();
	});
});
