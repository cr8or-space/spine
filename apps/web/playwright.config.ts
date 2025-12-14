import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	timeout: 90000, // Global timeout for all tests
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		actionTimeout: 15000, // Timeout for individual actions
		navigationTimeout: 30000, // Timeout for navigation
		screenshot: 'only-on-failure', // Capture screenshots on failure
		video: 'retain-on-failure' // Keep videos only when tests fail
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
});
