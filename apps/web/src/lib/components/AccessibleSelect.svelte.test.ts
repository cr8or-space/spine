import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AccessibleSelect from './AccessibleSelect.svelte';

describe('AccessibleSelect', () => {
	const options = [
		{ value: 'opt1', label: 'Option 1' },
		{ value: 'opt2', label: 'Option 2' },
		{ value: 'opt3', label: 'Option 3' },
	];

	it('renders with label when provided', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				label: 'Choose option',
				value: 'opt1',
				options,
			},
		});
		const label = container.querySelector('.label');
		expect(label).toBeTruthy();
		expect(label?.textContent).toBe('Choose option');
	});

	it('renders trigger button', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				value: 'opt1',
				options,
			},
		});
		const trigger = container.querySelector('.select-trigger');
		expect(trigger).toBeTruthy();
	});

	it('displays selected value label', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				value: 'opt2',
				options,
			},
		});
		const valueDisplay = container.querySelector('.select-value');
		expect(valueDisplay?.textContent).toBe('Option 2');
	});

	it('displays placeholder when no value selected', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				value: '',
				options,
				placeholder: 'Select something...',
			},
		});
		const valueDisplay = container.querySelector('.select-value');
		expect(valueDisplay?.textContent).toBe('Select something...');
		expect(valueDisplay?.classList.contains('placeholder')).toBe(true);
	});

	it('shows error state when error provided', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				value: '',
				options,
				error: 'This field is required',
			},
		});
		const field = container.querySelector('.select-field');
		expect(field?.classList.contains('has-error')).toBe(true);
		const errorText = container.querySelector('.error-text');
		expect(errorText?.textContent).toBe('This field is required');
	});

	it('shows hint when provided and no error', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				value: 'opt1',
				options,
				hint: 'Select your preferred option',
			},
		});
		const hintText = container.querySelector('.hint-text');
		expect(hintText?.textContent).toBe('Select your preferred option');
	});

	it('has proper ARIA attributes for error state', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				id: 'test-select',
				value: '',
				options,
				error: 'Required',
			},
		});
		const trigger = container.querySelector('.select-trigger');
		expect(trigger?.getAttribute('aria-invalid')).toBe('true');
		expect(trigger?.getAttribute('aria-describedby')).toBe('test-select-error');
	});

	it('associates label with trigger via id', async () => {
		const { container } = render(AccessibleSelect, {
			props: {
				id: 'my-select',
				label: 'My Label',
				value: 'opt1',
				options,
			},
		});
		const label = container.querySelector('.label');
		const trigger = container.querySelector('.select-trigger');
		expect(label?.getAttribute('for')).toBe('my-select');
		expect(trigger?.getAttribute('id')).toBe('my-select');
	});
});
