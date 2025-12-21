/**
 * Mock for $app/stores in vitest browser tests
 */

import { readable } from 'svelte/store';

// Mock page store with default values
export const page = readable({
	url: new URL('http://localhost:4173'),
	params: {},
	route: { id: '/' },
	status: 200,
	error: null,
	data: {},
	state: {},
	form: null,
});

// Mock navigating store
export const navigating = readable(null);

// Mock updated store
export const updated = {
	subscribe: readable(false).subscribe,
	check: async () => false,
};

// Mock getStores function
export function getStores() {
	return {
		page,
		navigating,
		updated,
	};
}
