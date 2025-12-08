import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import TextField from './TextField.svelte';

describe('TextField', () => {
	it('renders with label', async () => {
		render(TextField, {
			props: { label: 'Username', value: '' },
		});
		const input = page.getByRole('textbox', { name: 'Username' });
		await expect.element(input).toBeInTheDocument();
	});

	it('renders with placeholder', async () => {
		render(TextField, {
			props: { label: 'Email', placeholder: 'Enter your email', value: '' },
		});
		const input = page.getByPlaceholder('Enter your email');
		await expect.element(input).toBeInTheDocument();
	});

	it('can be required', async () => {
		const { container } = render(TextField, {
			props: { label: 'Required Field', required: true, value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.hasAttribute('required')).toBe(true);
	});

	it('can be disabled', async () => {
		render(TextField, {
			props: { label: 'Disabled Field', disabled: true, value: '' },
		});
		const input = page.getByRole('textbox', { name: 'Disabled Field' });
		await expect.element(input).toBeDisabled();
	});

	it('accepts different input types', async () => {
		const { container } = render(TextField, {
			props: { label: 'Email', type: 'email', value: '' },
		});
		const input = container.querySelector('input[type="email"]');
		expect(input).toBeTruthy();
	});

	it('renders with error message', async () => {
		render(TextField, {
			props: { label: 'Field', error: 'This field is required', value: '' },
		});
		const error = page.getByText('This field is required');
		await expect.element(error).toBeInTheDocument();
	});

	it('sets aria-invalid when error is present', async () => {
		const { container } = render(TextField, {
			props: { label: 'Field', error: 'Error message', value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.getAttribute('aria-invalid')).toBe('true');
	});

	it('renders hint text when provided', async () => {
		render(TextField, {
			props: { label: 'Field', hint: 'Enter a valid value', value: '' },
		});
		const hint = page.getByText('Enter a valid value');
		await expect.element(hint).toBeInTheDocument();
	});

	it('allows user to type in the field', async () => {
		render(TextField, {
			props: { label: 'Name', value: '' },
		});
		const input = page.getByRole('textbox', { name: 'Name' });
		await userEvent.fill(input, 'John Doe');
		await expect.element(input).toHaveValue('John Doe');
	});
});
