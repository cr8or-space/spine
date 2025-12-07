// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { ProjectService } from '@repo/core';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			projectService: ProjectService;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
