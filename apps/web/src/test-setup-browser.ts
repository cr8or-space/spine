/**
 * Test setup file for Vitest browser mode with vitest-browser-svelte
 * This file runs before all browser-based tests
 */

import { afterEach } from 'vitest';
import { cleanup as browserCleanup } from 'vitest-browser-svelte';
import { cleanup as testingLibraryCleanup } from '@testing-library/svelte';

// Cleanup after each test to prevent test pollution
// Both cleanup functions are called to support tests using either library
afterEach(() => {
	testingLibraryCleanup();
	browserCleanup();
});
