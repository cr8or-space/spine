import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Tabs from './Tabs.svelte';

describe('Tabs', () => {
	const tabs = [
		{ id: 'tab1', label: 'Tab 1', count: 5 },
		{ id: 'tab2', label: 'Tab 2', count: 3 },
		{ id: 'tab3', label: 'Tab 3' },
	];

	it('renders all tabs', async () => {
		const { container } = render(Tabs, { props: { tabs, active: 'tab1' } });
		const tabElements = container.querySelectorAll('.tab');
		expect(tabElements.length).toBe(3);
		expect(tabElements[0].textContent).toContain('Tab 1');
		expect(tabElements[1].textContent).toContain('Tab 2');
		expect(tabElements[2].textContent).toContain('Tab 3');
	});

	it('renders tab counts when provided', async () => {
		const { container } = render(Tabs, { props: { tabs, active: 'tab1' } });
		// Count badges are inside .tab-count elements
		const countBadges = container.querySelectorAll('.tab-count');
		expect(countBadges.length).toBe(2);
		expect(countBadges[0].textContent).toBe('5');
		expect(countBadges[1].textContent).toBe('3');
	});

	it('applies active class to the active tab', async () => {
		const { container } = render(Tabs, { props: { tabs, active: 'tab1' } });
		const tabButtons = container.querySelectorAll('.tab');
		expect(tabButtons[0].classList.contains('active')).toBe(true);
		expect(tabButtons[1].classList.contains('active')).toBe(false);
	});

	it('sets correct ARIA attributes', async () => {
		const { container } = render(Tabs, { props: { tabs, active: 'tab1' } });
		const tabButtons = container.querySelectorAll('[role="tab"]');
		expect(tabButtons[0].getAttribute('aria-selected')).toBe('true');
		expect(tabButtons[1].getAttribute('aria-selected')).toBe('false');
	});
});
