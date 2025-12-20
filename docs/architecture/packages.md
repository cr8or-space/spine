# Package Architecture

Spine uses a monorepo structure with Turborepo and pnpm workspaces. This document describes each package's purpose and dependencies.

## Directory Structure

```
spine/
├── apps/
│   ├── web/        # SvelteKit web application
│   ├── server/     # Standalone WebSocket server
│   └── cli/        # Command-line interface
└── packages/
    ├── types/      # Shared types and schemas
    ├── core/       # Domain logic and storage
    ├── llm/        # LLM client and context
    ├── server/     # WebSocket server implementation
    ├── client/     # WebSocket client library
    ├── mcp/        # MCP server for LLM tools
    ├── ui/         # Shared Svelte components
    ├── eslint-config/      # Shared ESLint config
    └── typescript-config/  # Shared TypeScript config
```

## Applications

### apps/web

SvelteKit web application providing the full UI experience.

**Stack**: Svelte 5, Vite, Tailwind CSS v4, Bits UI

**Key directories**:
- `src/routes/` - SvelteKit routes and pages
- `src/lib/components/` - UI components
- `src/lib/shell/` - Application shell (AppShell, TopBar, NavRail)

**Dependencies**: `@repo/types`, `@repo/core`, `@repo/llm`, `@repo/ui`

### apps/server

Standalone WebSocket server for CLI and MCP integration.

**CLI options**:
- `--port` - Server port (default: 8080)
- `--host` - Server host (default: localhost)
- `--data-dir` - Data directory
- `--llm-endpoint` - LLM API endpoint
- `--llm-api-key` - LLM API key
- `--llm-model` - LLM model name

**Configuration sources** (priority order):
1. CLI arguments
2. Environment variables (`SPINE_*`)
3. Config file (`~/.config/spine/server.json`)
4. Defaults

**Dependencies**: `@repo/server`

### apps/cli

Command-line interface for interacting with Spine server.

See [docs/user/cli.md](../user/cli.md) for usage documentation.

**Dependencies**: `@repo/client`, `@repo/types`

## Packages

### @repo/types

Shared TypeScript types and Zod schemas for all domain entities.

**Exports**:
- Project, Bible, Structure, Content interfaces
- Character, Location, Faction, WorldRule, PlotThread types
- Timeline and event types
- Analysis and review types
- Zod schemas for runtime validation

**Dependencies**: `zod`

### @repo/core

Domain logic including storage, services, and business rules.

**Modules**:
- `storage/` - SQLite schema, migrations, repositories
- `bible/` - Entity management
- `structure/` - Outline tree operations
- `content/` - Content storage and versioning
- `generation/` - Pipeline orchestration
- `analysis/` - Tension, hooks, pacing analysis
- `review/` - Review workflow and cascade
- `release/` - Serial publishing features

**Dependencies**: `@repo/types`, `@repo/llm`, `libsql`

### @repo/llm

OpenAI-compatible LLM client and context assembly.

**Modules**:
- `client.ts` - API client with streaming
- `context.ts` - Context assembly with relevance scoring
- `tokens.ts` - Token counting utilities
- `prompts/` - Prompt templates

**Dependencies**: `openai`, `tiktoken`

### @repo/server

WebSocket server implementation with JSON-RPC 2.0 protocol.

**Modules**:
- `server.ts` - WebSocket server infrastructure
- `connection.ts` - Connection state management
- `router.ts` - Request routing with validation
- `subscriptions.ts` - Real-time update subscriptions
- `handlers/` - Domain-specific handlers

See [docs/user/api.md](../user/api.md) for API documentation.

**Dependencies**: `@repo/types`, `@repo/core`, `@repo/llm`, `ws`

### @repo/client

WebSocket client library for connecting to Spine server.

**Features**:
- Auto-reconnect with configurable retry
- Request/response correlation with timeouts
- Subscription management
- Typed API methods for all domains

**Dependencies**: `@repo/types`, `ws`

### @repo/mcp

MCP (Model Context Protocol) server for LLM tool integration.

**Tools provided**: 45+ tools organized by domain:
- `spine_project_*` - Project management
- `spine_bible_*` - Entity management
- `spine_structure_*` - Outline management
- `spine_content_*` - Content operations
- `spine_generate_*` - Content generation
- `spine_review_*` - Review workflow
- `spine_analytics_*` - Analytics data
- `spine_serial_*` - Serial features

See [docs/user/mcp.md](../user/mcp.md) for usage documentation.

**Dependencies**: `@repo/client`, `@modelcontextprotocol/sdk`

### @repo/ui

Shared Svelte components used across applications.

**Components**: Design system primitives and composite components.

**Dependencies**: `svelte`, `bits-ui`, `lucide-svelte`

### @repo/eslint-config

Shared ESLint configuration for all packages.

### @repo/typescript-config

Shared TypeScript configuration with base `tsconfig.json` files.

## Dependency Graph

```
apps/web ─────────┬─► @repo/core ─────► @repo/types
                  │                     │
                  ├─► @repo/llm ────────┘
                  │
                  └─► @repo/ui

apps/server ──────► @repo/server ─────┬─► @repo/core
                                      │
                                      └─► @repo/llm

apps/cli ─────────► @repo/client ─────► @repo/types

packages/mcp ─────► @repo/client
```

## Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/server && pnpm build

# Development mode
pnpm dev
```

## Test Counts by Package

| Package | Tests | Status |
|---------|-------|--------|
| @repo/server | 92 | Passing |
| @repo/client | 116 | Passing |
| @repo/mcp | 72 (38 unit + 34 integration) | Passing |
| apps/server | 14 | Passing |
| apps/cli | 24 | Passing |
