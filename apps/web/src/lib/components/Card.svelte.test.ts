import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Card from './Card.svelte';

describe('Card', () => {
	it('renders with default props', () => {
		const { container } = render(Card, {
			props: {
				children: () => 'Card content',
			},
		});
		// Card has bg-surface border border-border rounded-lg classes
		const card = container.querySelector('.bg-surface');
		expect(card).toBeTruthy();
	});

	it('applies hover class when hover prop is true', () => {
		const { container } = render(Card, {
			props: {
				hover: true,
				children: () => '',
			},
		});
		const card = container.querySelector('.cursor-pointer');
		expect(card).toBeTruthy();
	});

	it('applies padding none class when padding is "none"', () => {
		const { container } = render(Card, {
			props: {
				padding: 'none',
				children: () => '',
			},
		});
		const card = container.querySelector('.p-0');
		expect(card).toBeTruthy();
	});
});
