import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		// Externalize native SQLite modules - they can't be bundled
		noExternal: ['@repo/core', '@repo/types', '@repo/llm', '@repo/ui'],
		external: ['libsql']
	}
});
