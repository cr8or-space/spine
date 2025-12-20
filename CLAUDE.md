# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spine is a tool for producing web serials at scale using LLM assistance. It manages story bibles, tracks continuity, visualizes pacing, and orchestrates content generation with human review. Single-author, local-first, OpenAI-compatible API for LLM access.

## SvelteKit Unbreakable Rules
Unbreakable Rules:
- Always use locators (page.getBy*()) - never containers in vitest-browser-svelte
- Use .first(), .nth(), .last() for multiple elements to avoid strict mode violations
- Always use untrack() when accessing $derived values in tests
- Use real FormData/Request objects in server tests - minimal mocking only
- Follow naming conventions: kebab-case files, snake_case variables
- Always run pnpm lint after making changes
- Never click SvelteKit form submit buttons - test state directly
- Use await expect.element() for all locator assertions

## Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier
pnpm check-types      # TypeScript type checking

# Web app specific (from apps/web/)
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests (vitest)
pnpm test:integration # Run integration tests (playwright)
pnpm check            # Svelte type checking
```

## Architecture

**Monorepo Structure** (Turborepo + pnpm workspaces):
- `apps/web` — SvelteKit application (Svelte 5, Vite)
- `packages/types` — Zod schemas and TypeScript types for all domain entities
- `packages/core` — Domain logic: storage (SQLite), bible, structure, generation, analysis, version, review, continuity, release
- `packages/llm` — OpenAI-compatible client, token counting, context assembly with relevance scoring
- `packages/ui` — Shared Svelte components
- `packages/eslint-config` — Shared ESLint configuration
- `packages/typescript-config` — Shared TypeScript configuration

**Package Testing:**
```bash
# Run tests for specific package
cd packages/core && pnpm test
cd packages/llm && pnpm test
cd packages/types && pnpm test
```

## Key Concepts

- **Story Bible** — Characters, locations, factions, world rules, plot threads, timeline
- **Structure** — Hierarchical outline: Book → Arc → Chapter → Scene with tension targets
- **Content** — Versioned prose with analysis scores and review status
- **Lock Points** — Author-specified points that protect content from revision cascades
- **Published content is immutable** — Once published, content cannot change

## Code Style

- TypeScript strict mode, Zod for runtime validation
- kebab-case files, camelCase functions, PascalCase types, UPPER_SNAKE_CASE constants
- Vitest for unit tests, Playwright for integration tests
- Co-locate tests: `foo.ts` → `foo.test.ts`
- Imports: external → internal → relative, alphabetized within groups

## Documentation

Key docs in `docs/`:
- `goals.md` — Project objectives and guiding principles
- `rationale.md` — Design decisions with justifications
- `proposal/project-proposal.md` — Full system design
- `implementation/plan.md` — Phased implementation roadmap
- `implementation/tasks.md` — Checklist of completed work
- `development/coding-style.md` — Detailed code conventions
- `user/api.md` — WebSocket API documentation
- `user/cli.md` — CLI usage guide
