import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import Tabs from './Tabs.svelte';

describe('Tabs', () => {
	const tabs = [
		{ id: 'tab1', label: 'Tab 1', count: 5 },
		{ id: 'tab2', label: 'Tab 2', count: 3 },
		{ id: 'tab3', label: 'Tab 3' },
	];

	it('renders all tabs', async () => {
		render(Tabs, { props: { tabs, active: 'tab1' } });
		const tab1 = page.getByRole('tab', { name: /Tab 1/i });
		const tab2 = page.getByRole('tab', { name: /Tab 2/i });
		const tab3 = page.getByRole('tab', { name: /Tab 3/i });
		await expect.element(tab1).toBeInTheDocument();
		await expect.element(tab2).toBeInTheDocument();
		await expect.element(tab3).toBeInTheDocument();
	});

	it('renders tab counts when provided', async () => {
		const { container } = render(Tabs, { props: { tabs, active: 'tab1' } });
		const countBadges = container.querySelectorAll('.tab-count');
		expect(countBadges.length).toBe(2);
		expect(countBadges[0].textContent).toBe('5');
		expect(countBadges[1].textContent).toBe('3');
	});

	it('marks the active tab with data-state attribute', async () => {
		render(Tabs, { props: { tabs, active: 'tab1' } });

		const tab1 = page.getByRole('tab', { name: /Tab 1/ });
		const tab2 = page.getByRole('tab', { name: /Tab 2/ });

		await expect.element(tab1).toHaveAttribute('data-state', 'active');
		await expect.element(tab2).toHaveAttribute('data-state', 'inactive');
	});

	it('sets correct ARIA attributes for active tab', async () => {
		render(Tabs, { props: { tabs, active: 'tab1' } });
		const tab1 = page.getByRole('tab', { name: /Tab 1/i });
		const tab2 = page.getByRole('tab', { name: /Tab 2/i });
		await expect.element(tab1).toHaveAttribute('aria-selected', 'true');
		await expect.element(tab2).toHaveAttribute('aria-selected', 'false');
	});

	it('has tablist role on container', async () => {
		render(Tabs, { props: { tabs, active: 'tab1' } });
		const tablist = page.getByRole('tablist');
		await expect.element(tablist).toBeInTheDocument();
	});

	it('allows clicking tabs to change selection', async () => {
		render(Tabs, { props: { tabs, active: 'tab1' } });
		const tab1 = page.getByRole('tab', { name: /Tab 1/i });
		const tab2 = page.getByRole('tab', { name: /Tab 2/i });

		await userEvent.click(tab2);

		// After click, tab2 should be active (Bits UI uses data-state attribute)
		await expect.element(tab2).toHaveAttribute('data-state', 'active');
		await expect.element(tab1).toHaveAttribute('data-state', 'inactive');
	});

	it('supports horizontal orientation by default', async () => {
		const { container } = render(Tabs, { props: { tabs, active: 'tab1' } });
		const tabsList = container.querySelector('.tabs-list');
		expect(tabsList?.classList.contains('vertical')).toBe(false);
	});

	it('supports vertical orientation', async () => {
		const { container } = render(Tabs, { props: { tabs, active: 'tab1', orientation: 'vertical' } });
		const tabsList = container.querySelector('.tabs-list');
		expect(tabsList?.classList.contains('vertical')).toBe(true);
	});
});
