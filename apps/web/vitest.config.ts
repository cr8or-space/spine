import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			// Mock SvelteKit modules for vitest browser tests
			'$app/navigation': path.resolve('./src/test-mocks/app/navigation.ts'),
			'$app/stores': path.resolve('./src/test-mocks/app/stores.ts'),
			'$app/environment': path.resolve('./src/test-mocks/app/environment.ts'),
			'$app/forms': path.resolve('./src/test-mocks/app/forms.ts'),
		},
	},
	optimizeDeps: {
		include: ['lucide-svelte'],
	},
	test: {
		globals: true,
		include: ['src/**/*.{test,spec}.ts', 'src/**/*.svelte.{test,spec}.ts'],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright({
				launch: {
					args: ['--no-sandbox', '--disable-setuid-sandbox'],
				},
			}),
			instances: [{ browser: 'chromium' }],
		},
		setupFiles: ['./src/test-setup-browser.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/test-setup.ts',
				'src/test-setup-browser.ts',
				'**/*.spec.ts',
				'**/*.test.ts',
			],
		},
	},
});
