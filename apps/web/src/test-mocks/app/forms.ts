/**
 * Mock for $app/forms in vitest browser tests
 */

import { vi } from 'vitest';

export const enhance = vi.fn(() => {
	return {
		destroy: vi.fn(),
	};
});

export const applyAction = vi.fn();

export const deserialize = vi.fn((result: string) => {
	return JSON.parse(result);
});
