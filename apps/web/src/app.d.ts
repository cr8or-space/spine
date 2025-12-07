// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { ProjectService } from '@repo/core';
import type Database from 'libsql';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			projectService: ProjectService;
			db: Database.Database;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
