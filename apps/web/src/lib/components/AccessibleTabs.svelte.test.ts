import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AccessibleTabs from './AccessibleTabs.svelte';

describe('AccessibleTabs', () => {
	const tabs = [
		{ id: 'tab1', label: 'Tab 1', count: 5 },
		{ id: 'tab2', label: 'Tab 2', count: 3 },
		{ id: 'tab3', label: 'Tab 3' },
	];

	it('renders all tabs', async () => {
		const { container } = render(AccessibleTabs, { props: { tabs, active: 'tab1' } });
		const tabElements = container.querySelectorAll('.tab');
		expect(tabElements.length).toBe(3);
		expect(tabElements[0].textContent).toContain('Tab 1');
		expect(tabElements[1].textContent).toContain('Tab 2');
		expect(tabElements[2].textContent).toContain('Tab 3');
	});

	it('renders tab counts when provided', async () => {
		const { container } = render(AccessibleTabs, { props: { tabs, active: 'tab1' } });
		const countBadges = container.querySelectorAll('.tab-count');
		expect(countBadges.length).toBe(2);
		expect(countBadges[0].textContent).toBe('5');
		expect(countBadges[1].textContent).toBe('3');
	});

	it('applies active state to the active tab', async () => {
		const { container } = render(AccessibleTabs, { props: { tabs, active: 'tab1' } });
		const tabButtons = container.querySelectorAll('.tab');
		// Bits UI uses data-state="active" for active tabs
		expect(tabButtons[0].getAttribute('data-state')).toBe('active');
		expect(tabButtons[1].getAttribute('data-state')).toBe('inactive');
	});

	it('sets correct ARIA attributes', async () => {
		const { container } = render(AccessibleTabs, { props: { tabs, active: 'tab1' } });
		// Bits UI Tabs use proper tab role
		const tabButtons = container.querySelectorAll('[role="tab"]');
		expect(tabButtons.length).toBe(3);
		expect(tabButtons[0].getAttribute('aria-selected')).toBe('true');
		expect(tabButtons[1].getAttribute('aria-selected')).toBe('false');
	});

	it('has tablist role on container', async () => {
		const { container } = render(AccessibleTabs, { props: { tabs, active: 'tab1' } });
		const tablist = container.querySelector('[role="tablist"]');
		expect(tablist).toBeTruthy();
	});

	it('supports vertical orientation', async () => {
		const { container } = render(AccessibleTabs, {
			props: { tabs, active: 'tab1', orientation: 'vertical' },
		});
		const tablist = container.querySelector('.tabs-list');
		expect(tablist?.classList.contains('vertical')).toBe(true);
	});

	it('defaults to first tab when no active provided', async () => {
		const { container } = render(AccessibleTabs, { props: { tabs } });
		// Wait for effect to run
		await new Promise((resolve) => setTimeout(resolve, 10));

		const tabButtons = container.querySelectorAll('.tab');
		expect(tabButtons[0].getAttribute('data-state')).toBe('active');
	});
});
