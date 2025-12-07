import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EntityCard from './EntityCard.svelte';

describe('EntityCard', () => {
	it('renders with required props', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'A test description',
			},
		});
		const link = container.querySelector('a');
		expect(link?.getAttribute('href')).toBe('/test/1');
		expect(container.textContent).toContain('Test Entity');
		expect(container.textContent).toContain('A test description');
	});

	it('renders aliases when provided', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				aliases: ['Alias One', 'Alias Two'],
			},
		});
		expect(container.textContent).toContain('Also known as:');
		expect(container.textContent).toContain('Alias One, Alias Two');
	});

	it('does not render aliases section when empty', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				aliases: [],
			},
		});
		const aliases = container.querySelector('.entity-aliases');
		expect(aliases).toBeFalsy();
	});

	it('renders badges when provided', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				badges: [
					{ text: 'Active', variant: 'success' },
					{ text: 'Major', variant: 'primary' },
				],
			},
		});
		expect(container.textContent).toContain('Active');
		expect(container.textContent).toContain('Major');
	});

	it('does not render badges section when empty', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				badges: [],
			},
		});
		const badges = container.querySelector('.entity-badges');
		expect(badges).toBeFalsy();
	});

	it('truncates long descriptions', async () => {
		const longDescription = 'A'.repeat(300);
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: longDescription,
				maxDescLength: 200,
			},
		});
		const desc = container.querySelector('.entity-description');
		expect(desc?.textContent!.length).toBeLessThan(210);
		expect(desc?.textContent!.endsWith('...')).toBe(true);
	});

	it('does not truncate short descriptions', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Short description',
			},
		});
		expect(container.textContent).toContain('Short description');
	});

	it('renders meta items with text', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				meta: [{ text: '5 traits' }, { text: '3 relationships' }],
			},
		});
		expect(container.textContent).toContain('5 traits');
		expect(container.textContent).toContain('3 relationships');
	});

	it('does not render meta section when empty', async () => {
		const { container } = render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				meta: [],
			},
		});
		const meta = container.querySelector('.entity-meta');
		expect(meta).toBeFalsy();
	});
});
