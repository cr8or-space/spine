import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
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
		const { container } = render(EntityListPage, {
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
		expect(container.textContent).toContain('3 items');
	});

	it('renders singular form for one item', async () => {
		const { container } = render(EntityListPage, {
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
		expect(container.textContent).toContain('1 item');
	});

	it('renders empty state when no items', async () => {
		const { container } = render(EntityListPage, {
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
		expect(container.textContent).toContain('No items yet');
		expect(container.textContent).toContain('Create your first item to get started');
	});

	it('renders filtered empty state when search yields no results', async () => {
		const { container } = render(EntityListPage, {
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
		expect(container.textContent).toContain('No items found');
		expect(container.textContent).toContain('Try adjusting your search query or filters.');
	});

	it('filters items by search query on name', async () => {
		const { container } = render(EntityListPage, {
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
		expect(container.textContent).toContain('1 item');
		expect(container.textContent).toContain('(filtered from 3)');
	});

	it('filters items by search query on description', async () => {
		const { container } = render(EntityListPage, {
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
		expect(container.textContent).toContain('1 item');
	});

	it('filters items by search query on aliases', async () => {
		const { container } = render(EntityListPage, {
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
		expect(container.textContent).toContain('1 item');
	});

	it('renders New button with entity name', async () => {
		const { container } = render(EntityListPage, {
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
		// Button has bg-primary class
		const newButton = container.querySelector('.bg-primary');
		expect(newButton?.textContent).toContain('New Character');
	});

	it('calls onCreateClick when New button clicked', async () => {
		const handleCreate = vi.fn();
		const { container } = render(EntityListPage, {
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
		const newButton = container.querySelector('.bg-primary') as HTMLButtonElement;
		newButton.click();
		expect(handleCreate).toHaveBeenCalledOnce();
	});

	it('renders filter controls', async () => {
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
		const selects = container.querySelectorAll('select');
		expect(selects.length).toBe(1);
		expect(container.textContent).toContain('All roles');
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

		// Initially no Clear button - it has underline class
		let clearButton = container.querySelector('button.underline');
		expect(clearButton).toBeFalsy();

		// Select a filter value
		const select = container.querySelector('select') as HTMLSelectElement;
		select.value = 'major';
		select.dispatchEvent(new Event('change', { bubbles: true }));

		// Wait for reactivity
		await new Promise((r) => setTimeout(r, 50));

		// Now Clear button should appear
		clearButton = container.querySelector('button.underline');
		expect(clearButton).toBeTruthy();
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
		const select = container.querySelector('select') as HTMLSelectElement;
		select.value = 'major';
		select.dispatchEvent(new Event('change', { bubbles: true }));

		// Wait for reactivity
		await new Promise((r) => setTimeout(r, 50));

		// Click Clear
		const clearButton = container.querySelector('button.underline') as HTMLButtonElement;
		clearButton.click();

		// Wait for reactivity
		await new Promise((r) => setTimeout(r, 50));

		// Filter should be reset - Clear button should disappear
		expect(container.querySelector('button.underline')).toBeFalsy();
	});
});
