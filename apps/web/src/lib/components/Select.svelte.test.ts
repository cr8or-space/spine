import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Select from './Select.svelte';

describe('Select', () => {
	const options = [
		{ value: 'opt1', label: 'Option 1' },
		{ value: 'opt2', label: 'Option 2' },
		{ value: 'opt3', label: 'Option 3' },
	];

	it('renders with label', async () => {
		render(Select, {
			props: {
				label: 'Test Label',
				value: 'opt1',
				options,
			},
		});

		await expect.element(page.getByText('Test Label')).toBeVisible();
	});

	it('renders trigger button with selected value', async () => {
		render(Select, {
			props: {
				label: 'Test',
				value: 'opt2',
				options,
			},
		});

		// The trigger should show the selected option's label
		await expect.element(page.getByText('Option 2')).toBeVisible();
	});

	it('renders placeholder when no value selected', async () => {
		render(Select, {
			props: {
				label: 'Test',
				value: '',
				options,
				placeholder: 'Choose one...',
			},
		});

		await expect.element(page.getByText('Choose one...')).toBeVisible();
	});

	it('opens dropdown when trigger is clicked', async () => {
		render(Select, {
			props: {
				label: 'Test',
				value: 'opt1',
				options,
			},
		});

		// Bits UI Select trigger has data-select-trigger attribute
		const trigger = page.getByRole('button').first();
		await trigger.click();

		// All options should be visible in the dropdown (using portal)
		await expect.element(page.getByRole('option', { name: 'Option 1' })).toBeVisible();
		await expect.element(page.getByRole('option', { name: 'Option 2' })).toBeVisible();
		await expect.element(page.getByRole('option', { name: 'Option 3' })).toBeVisible();
	});

	it('renders error message when error is provided', async () => {
		render(Select, {
			props: {
				label: 'Test',
				value: 'opt1',
				options,
				error: 'This field is required',
			},
		});

		await expect.element(page.getByText('This field is required')).toBeVisible();
	});

	it('renders hint message when hint is provided', async () => {
		render(Select, {
			props: {
				label: 'Test',
				value: 'opt1',
				options,
				hint: 'Select an option from the list',
			},
		});

		await expect.element(page.getByText('Select an option from the list')).toBeVisible();
	});

	it('sets aria-invalid when error is present', async () => {
		const { container } = render(Select, {
			props: {
				label: 'Test',
				value: 'opt1',
				options,
				error: 'Error message',
			},
		});

		// Query the trigger button directly since it might not have combobox role
		const trigger = container.querySelector('.select-trigger');
		expect(trigger).toBeTruthy();
		expect(trigger?.getAttribute('aria-invalid')).toBe('true');
	});

	it('renders in disabled state when disabled is true', async () => {
		const { container } = render(Select, {
			props: {
				label: 'Test',
				value: 'opt1',
				options,
				disabled: true,
			},
		});

		const trigger = container.querySelector('.select-trigger');
		expect(trigger).toBeTruthy();
		expect(trigger?.hasAttribute('data-disabled')).toBe(true);
		expect(trigger?.hasAttribute('disabled')).toBe(true);
	});
});
