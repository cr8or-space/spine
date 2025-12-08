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
		const card = container.querySelector('.card');
		expect(card).toBeTruthy();
		expect(card?.classList.contains('card-padding-md')).toBe(true);
	});

	it('applies hover class when hover prop is true', async () => {
		const { container } = render(Card, {
			props: {
				hover: true,
				children: () => 'Hoverable card',
			},
		});
		const card = container.querySelector('.card');
		expect(card?.classList.contains('hover')).toBe(true);
	});

	it('applies small padding class when padding is "sm"', async () => {
		const { container } = render(Card, {
			props: {
				padding: 'sm',
				children: () => 'Small padding',
			},
		});
		const card = container.querySelector('.card');
		expect(card?.classList.contains('card-padding-sm')).toBe(true);
	});

	it('applies large padding class when padding is "lg"', async () => {
		const { container } = render(Card, {
			props: {
				padding: 'lg',
				children: () => 'Large padding',
			},
		});
		const card = container.querySelector('.card');
		expect(card?.classList.contains('card-padding-lg')).toBe(true);
	});

	it('applies no padding class when padding is "none"', async () => {
		const { container } = render(Card, {
			props: {
				padding: 'none',
				children: () => 'No padding',
			},
		});
		const card = container.querySelector('.card');
		expect(card?.classList.contains('card-padding-none')).toBe(true);
	});
});
