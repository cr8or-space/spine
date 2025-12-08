import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TextField from './TextField.svelte';

describe('TextField', () => {
	it('renders with label', async () => {
		const { container } = render(TextField, {
			props: { label: 'Username', value: '' },
		});
		const label = container.querySelector('label');
		expect(label).toBeTruthy();
		expect(label?.textContent).toContain('Username');
	});

	it('renders with placeholder', async () => {
		const { container } = render(TextField, {
			props: { label: 'Email', placeholder: 'Enter your email', value: '' },
		});
		const input = container.querySelector('input[placeholder="Enter your email"]');
		expect(input).toBeTruthy();
	});

	it('can be required', async () => {
		const { container } = render(TextField, {
			props: { label: 'Required Field', required: true, value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.hasAttribute('required')).toBe(true);
	});

	it('can be disabled', async () => {
		const { container } = render(TextField, {
			props: { label: 'Disabled Field', disabled: true, value: '' },
		});
		const input = container.querySelector('input') as HTMLInputElement;
		expect(input?.disabled).toBe(true);
	});

	it('accepts different input types', async () => {
		const { container } = render(TextField, {
			props: { label: 'Email', type: 'email', value: '' },
		});
		const input = container.querySelector('input[type="email"]');
		expect(input).toBeTruthy();
	});

	it('renders with error message', async () => {
		const { container } = render(TextField, {
			props: { label: 'Field', error: 'This field is required', value: '' },
		});
		// Error text now uses text-danger class
		const error = container.querySelector('.text-danger');
		expect(error).toBeTruthy();
		expect(error?.textContent).toBe('This field is required');
	});

	it('sets aria-invalid when error is present', async () => {
		const { container } = render(TextField, {
			props: { label: 'Field', error: 'Error message', value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.getAttribute('aria-invalid')).toBe('true');
	});
});
