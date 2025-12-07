# NovelGen

A tool for producing web serials at scale using LLM assistance. Manages story bibles, tracks continuity, visualizes pacing, and orchestrates content generation with human review.

## Features

- **Story Bible** — Track characters, locations, factions, world rules, plot threads, and timeline
- **Continuity Checking** — Prevent contradictions from reaching publication
- **Pacing Visualization** — Plan tension curves and compare planned vs. actual
- **Generation Pipeline** — Outline → Beats → Draft → Review → Revision
- **Review Workflow** — Accept/reject/regenerate at paragraph granularity
- **Serialization Tools** — Hook tracking, tension cycles, release buffer management

## Quick Start

```bash
pnpm install
pnpm dev
```

## Commands

```bash
pnpm dev          # Start development server
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm format       # Format with Prettier
pnpm check-types  # TypeScript type checking
```

## Project Structure

```
apps/
└── web/              # SvelteKit application

packages/
├── ui/               # Shared Svelte components
├── eslint-config/    # Shared ESLint configuration
└── typescript-config/# Shared TypeScript configuration

docs/
├── goals.md          # Project objectives
├── rationale.md      # Design decisions
├── proposal/         # System design
├── implementation/   # Roadmap and status
├── development/      # Coding standards
└── examples/         # Sample story proposals
```

## Tech Stack

- **Framework**: SvelteKit + Svelte 5
- **Build**: Turborepo + pnpm workspaces
- **Language**: TypeScript (strict mode)
- **Testing**: Vitest + Playwright
- **LLM**: OpenAI-compatible API (supports local models)

## Documentation

- [Project Goals](docs/goals.md)
- [Design Rationale](docs/rationale.md)
- [Project Proposal](docs/proposal/project-proposal.md)
- [Implementation Plan](docs/implementation/plan.md)
- [Implementation Status](docs/implementation/status.md)
- [Coding Style](docs/development/coding-style.md)
