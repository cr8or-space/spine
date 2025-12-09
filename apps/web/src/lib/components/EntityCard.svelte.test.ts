import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import EntityCard from './EntityCard.svelte';

describe('EntityCard', () => {
	it('renders with required props', async () => {
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'A test description',
			},
		});
		const link = page.getByRole('link', { name: /Test Entity/i });
		await expect.element(link).toBeInTheDocument();
		await expect.element(link).toHaveAttribute('href', '/test/1');

		const heading = page.getByRole('heading', { name: 'Test Entity' });
		await expect.element(heading).toBeInTheDocument();

		const description = page.getByText('A test description');
		await expect.element(description).toBeInTheDocument();
	});

	it('renders aliases when provided', async () => {
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				aliases: ['Alias One', 'Alias Two'],
			},
		});
		const aliasLabel = page.getByText('Also known as:');
		await expect.element(aliasLabel).toBeInTheDocument();

		const aliasText = page.getByText('Alias One, Alias Two');
		await expect.element(aliasText).toBeInTheDocument();
	});

	it('does not render aliases section when empty', async () => {
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				aliases: [],
			},
		});
		await expect.element(page.getByText('Also known as:')).not.toBeInTheDocument();
	});

	it('renders badges when provided', async () => {
		render(EntityCard, {
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
		const activeBadge = page.getByText('Active');
		const majorBadge = page.getByText('Major');
		await expect.element(activeBadge).toBeInTheDocument();
		await expect.element(majorBadge).toBeInTheDocument();
	});

	it('does not render badges section when empty', async () => {
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				badges: [],
			},
		});
		// No badges to find - check only the description is present
		await expect.element(page.getByText('Description')).toBeInTheDocument();
	});

	it('truncates long descriptions', async () => {
		const longDescription = 'A'.repeat(300);
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: longDescription,
				maxDescLength: 200,
			},
		});
		// The truncated description should end with ...
		const truncated = page.getByText(/^A{180,}\.\.\.$/);
		await expect.element(truncated).toBeInTheDocument();
	});

	it('does not truncate short descriptions', async () => {
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Short description',
			},
		});
		const description = page.getByText('Short description');
		await expect.element(description).toBeInTheDocument();
	});

	it('renders meta items with text', async () => {
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				meta: [{ text: '5 traits' }, { text: '3 relationships' }],
			},
		});
		const traits = page.getByText('5 traits');
		const relationships = page.getByText('3 relationships');
		await expect.element(traits).toBeInTheDocument();
		await expect.element(relationships).toBeInTheDocument();
	});

	it('does not render meta section when empty', async () => {
		render(EntityCard, {
			props: {
				href: '/test/1',
				name: 'Test Entity',
				description: 'Description',
				meta: [],
			},
		});
		// Check description is there but no meta (no border-t element)
		await expect.element(page.getByText('Description')).toBeInTheDocument();
	});
});
