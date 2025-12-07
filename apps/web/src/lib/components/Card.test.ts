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
		const card = container.querySelector('.card');
		expect(card).toBeTruthy();
	});

	it('applies hover class when hover prop is true', () => {
		const { container } = render(Card, {
			props: {
				hover: true,
				children: () => '',
			},
		});
		const card = container.querySelector('.card');
		expect(card?.classList.contains('hover')).toBe(true);
	});

	it('applies padding none class when padding is "none"', () => {
		const { container } = render(Card, {
			props: {
				padding: 'none',
				children: () => '',
			},
		});
		const card = container.querySelector('.card');
		expect(card?.classList.contains('card-padding-none')).toBe(true);
	});
});
