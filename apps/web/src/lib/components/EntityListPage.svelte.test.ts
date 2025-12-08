import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import EntityListPage from './EntityListPage.svelte';

const mockItems = [
	{ id: '1', name: 'Item One', description: 'First item description', role: 'major' },
	{ id: '2', name: 'Item Two', description: 'Second item description', role: 'minor' },
	{ id: '3', name: 'Item Three', description: 'Third with alias', aliases: ['Three Alias'], role: 'major' },
];

const mockFilters = [
	{
		key: 'role',
		options: [
			{ value: 'major', label: 'Major' },
			{ value: 'minor', label: 'Minor' },
		],
		allLabel: 'All roles',
	},
];

describe('EntityListPage', () => {
	it('renders items count correctly', async () => {
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: mockFilters,
				searchQuery: '',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create your first item',
				onCreateClick: () => {},
				renderCard: (item: (typeof mockItems)[0]) => `Card: ${item.name}`,
			},
		});
		const count = page.getByText('3 items');
		await expect.element(count).toBeInTheDocument();
	});

	it('renders singular form for one item', async () => {
		render(EntityListPage, {
			props: {
				items: [mockItems[0]],
				filters: [],
				searchQuery: '',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create your first item',
				onCreateClick: () => {},
				renderCard: (item: (typeof mockItems)[0]) => `Card: ${item.name}`,
			},
		});
		const count = page.getByText('1 item');
		await expect.element(count).toBeInTheDocument();
	});

	it('renders empty state when no items', async () => {
		render(EntityListPage, {
			props: {
				items: [],
				filters: [],
				searchQuery: '',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items yet',
				emptyDescription: 'Create your first item to get started',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});
		const title = page.getByText('No items yet');
		const description = page.getByText('Create your first item to get started');
		await expect.element(title).toBeInTheDocument();
		await expect.element(description).toBeInTheDocument();
	});

	it('renders filtered empty state when search yields no results', async () => {
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: [],
				searchQuery: 'nonexistent',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items yet',
				emptyDescription: 'Create your first',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});
		const title = page.getByText('No items found');
		const description = page.getByText('Try adjusting your search query or filters.');
		await expect.element(title).toBeInTheDocument();
		await expect.element(description).toBeInTheDocument();
	});

	it('filters items by search query on name', async () => {
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: [],
				searchQuery: 'One',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});
		const count = page.getByText(/1 item/);
		await expect.element(count).toBeInTheDocument();
		const filtered = page.getByText(/\(filtered from 3\)/);
		await expect.element(filtered).toBeInTheDocument();
	});

	it('filters items by search query on description', async () => {
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: [],
				searchQuery: 'Second',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});
		const count = page.getByText(/1 item/);
		await expect.element(count).toBeInTheDocument();
	});

	it('filters items by search query on aliases', async () => {
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: [],
				searchQuery: 'Three Alias',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});
		const count = page.getByText(/1 item/);
		await expect.element(count).toBeInTheDocument();
	});

	it('renders New button with entity name', async () => {
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: [],
				searchQuery: '',
				entityName: 'Character',
				entityNamePlural: 'Characters',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});
		const newButton = page.getByRole('button', { name: /New Character/i });
		await expect.element(newButton).toBeInTheDocument();
	});

	it('calls onCreateClick when New button clicked', async () => {
		const handleCreate = vi.fn();
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: [],
				searchQuery: '',
				entityName: 'Item',
				entityNamePlural: 'Items',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: handleCreate,
				renderCard: () => '',
			},
		});
		const newButton = page.getByRole('button', { name: /New Item/i });
		await userEvent.click(newButton);
		expect(handleCreate).toHaveBeenCalledOnce();
	});

	it('renders filter controls', async () => {
		render(EntityListPage, {
			props: {
				items: mockItems,
				filters: mockFilters,
				searchQuery: '',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});
		const filterSelect = page.getByRole('combobox');
		await expect.element(filterSelect).toBeInTheDocument();
		const allRoles = page.getByText('All roles');
		await expect.element(allRoles).toBeInTheDocument();
	});

	it('shows Clear button when filters are active', async () => {
		const { container } = render(EntityListPage, {
			props: {
				items: mockItems,
				filters: mockFilters,
				searchQuery: '',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});

		// Initially no Clear button
		const clearButton = container.querySelector('.clear-filters');
		expect(clearButton).toBeFalsy();

		// Select a filter value
		const select = page.getByRole('combobox');
		await userEvent.selectOptions(select, 'major');

		// Now Clear button should appear
		const clearText = page.getByText('Clear');
		await expect.element(clearText).toBeInTheDocument();
	});

	it('clears filters when Clear button clicked', async () => {
		const { container } = render(EntityListPage, {
			props: {
				items: mockItems,
				filters: mockFilters,
				searchQuery: '',
				entityName: 'item',
				entityNamePlural: 'items',
				emptyTitle: 'No items',
				emptyDescription: 'Create',
				onCreateClick: () => {},
				renderCard: () => '',
			},
		});

		// Select a filter value
		const select = page.getByRole('combobox');
		await userEvent.selectOptions(select, 'major');

		// Click Clear
		const clearButton = page.getByText('Clear');
		await userEvent.click(clearButton);

		// Filter should be reset - Clear button should disappear
		await new Promise((r) => setTimeout(r, 50));
		expect(container.querySelector('.clear-filters')).toBeFalsy();
	});
});
