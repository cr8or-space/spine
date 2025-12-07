import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import TextField from './TextField.svelte';

describe('TextField', () => {
	it('renders with label', () => {
		const { getByText } = render(TextField, {
			props: { label: 'Username', value: '' },
		});
		expect(getByText('Username')).toBeTruthy();
	});

	it('renders with placeholder', () => {
		const { container } = render(TextField, {
			props: { label: 'Email', placeholder: 'Enter your email', value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.placeholder).toBe('Enter your email');
	});

	it('can be required', () => {
		const { container } = render(TextField, {
			props: { label: 'Required Field', required: true, value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.required).toBe(true);
	});

	it('can be disabled', () => {
		const { container } = render(TextField, {
			props: { label: 'Disabled Field', disabled: true, value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.disabled).toBe(true);
	});

	it('accepts different input types', () => {
		const { container } = render(TextField, {
			props: { label: 'Email', type: 'email', value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.type).toBe('email');
	});

	it('renders with error message', () => {
		const { getByText } = render(TextField, {
			props: { label: 'Field', error: 'This field is required', value: '' },
		});
		expect(getByText('This field is required')).toBeTruthy();
	});

	it('sets aria-invalid when error is present', () => {
		const { container } = render(TextField, {
			props: { error: 'Error message', value: '' },
		});
		const input = container.querySelector('input');
		expect(input?.getAttribute('aria-invalid')).toBe('true');
	});
});
