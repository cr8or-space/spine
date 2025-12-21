/**
 * Playwright Global Setup
 *
 * Creates a temporary database directory for integration tests.
 * This ensures tests don't pollute the development database.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DATA_DIR = path.join(os.tmpdir(), 'spine-playwright-tests');

async function globalSetup() {
	// Create temp directory for test data
	if (fs.existsSync(TEST_DATA_DIR)) {
		// Clean up any leftover test data
		fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
	}
	fs.mkdirSync(TEST_DATA_DIR, { recursive: true });

	// Set environment variable for the web server
	process.env.SPINE_DATA_DIR = TEST_DATA_DIR;

	console.log(`[Playwright Setup] Using test database directory: ${TEST_DATA_DIR}`);

	return () => {
		// Cleanup function runs after all tests
		console.log(`[Playwright Teardown] Cleaning up test database directory: ${TEST_DATA_DIR}`);
		if (fs.existsSync(TEST_DATA_DIR)) {
			fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
		}
	};
}

export default globalSetup;
