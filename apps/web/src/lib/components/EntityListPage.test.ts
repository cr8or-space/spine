import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
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
	it('renders items count correctly', () => {
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
				renderCard: (item: typeof mockItems[0]) => `Card: ${item.name}`,
			},
		});
		expect(container.textContent).toContain('3 items');
	});

	it('renders singular form for one item', () => {
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
				renderCard: (item: typeof mockItems[0]) => `Card: ${item.name}`,
			},
		});
		expect(container.textContent).toContain('1 item');
		expect(container.textContent).not.toContain('1 items');
	});

	it('renders empty state when no items', () => {
		const { getByText } = render(EntityListPage, {
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
		expect(getByText('No items yet')).toBeTruthy();
		expect(getByText('Create your first item to get started')).toBeTruthy();
	});

	it('renders filtered empty state when search yields no results', () => {
		const { getByText } = render(EntityListPage, {
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
		expect(getByText('No items found')).toBeTruthy();
		expect(getByText('Try adjusting your search query or filters.')).toBeTruthy();
	});

	it('filters items by search query on name', () => {
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

	it('filters items by search query on description', () => {
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

	it('filters items by search query on aliases', () => {
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

	it('renders New button with entity name', () => {
		const { getByText } = render(EntityListPage, {
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
		expect(getByText('New Character')).toBeTruthy();
	});

	it('calls onCreateClick when New button clicked', async () => {
		const handleCreate = vi.fn();
		const { getByText } = render(EntityListPage, {
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
		await fireEvent.click(getByText('New Item'));
		expect(handleCreate).toHaveBeenCalledOnce();
	});

	it('renders filter controls', () => {
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

		// Initially no Clear button
		let clearButton = container.querySelector('.clear-filters');
		expect(clearButton).toBeFalsy();

		// Select a filter value
		const select = container.querySelector('select');
		if (select) {
			await fireEvent.change(select, { target: { value: 'major' } });
		}

		// Now Clear button should appear
		clearButton = container.querySelector('.clear-filters');
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
		const select = container.querySelector('select');
		if (select) {
			await fireEvent.change(select, { target: { value: 'major' } });
		}

		// Click Clear
		const clearButton = container.querySelector('.clear-filters');
		if (clearButton) {
			await fireEvent.click(clearButton);
		}

		// Filter should be reset
		expect((select as HTMLSelectElement)?.value).toBe('');
	});
});
