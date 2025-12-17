# WebSocket API Migration Plan

## Purpose

Refactor the Spine application to use a WebSocket-based backend API, enabling:
1. Multiple client frontends (web UI, CLI/terminal app) sharing the same backend
2. Real-time updates and streaming for LLM generation
3. Clean separation of UI from domain logic
4. Event-driven architecture for better responsiveness

## Current Architecture

### How It Works Now

The SvelteKit web app currently uses a tightly-coupled architecture:

```
┌─────────────────────────────────────────────────────┐
│                    SvelteKit App                    │
├─────────────────────────────────────────────────────┤
│  +page.svelte    │  +page.server.ts (load/actions) │
│  (UI components) │  (server-side data loading)     │
├──────────────────┴──────────────────────────────────┤
│  hooks.server.ts                                    │
│  - Opens SQLite database                            │
│  - Creates ProjectService singleton                 │
│  - Attaches to event.locals                         │
├─────────────────────────────────────────────────────┤
│  @repo/core (domain logic + storage)               │
│  - ProjectService, BibleService, StructureService  │
│  - Repositories (SQLite via Drizzle)               │
│  - Generation pipeline, Analysis, Review, etc.     │
├─────────────────────────────────────────────────────┤
│  @repo/llm (LLM client)                            │
│  - OpenAI-compatible client                         │
│  - Streaming support                                │
└─────────────────────────────────────────────────────┘
```

**Current data flow:**
1. Page loads trigger `+page.server.ts` load functions
2. Load functions access `locals.projectService` / `locals.db`
3. Services are created per-request (e.g., `createBibleService(db, drizzle, projectId)`)
4. Form submissions use SvelteKit form actions
5. Actions call service methods directly
6. Page reloads/redirects to show updated data

**Key files:**
- [apps/web/src/hooks.server.ts](../../apps/web/src/hooks.server.ts) — Database/service initialization
- [apps/web/src/routes/+page.server.ts](../../apps/web/src/routes/+page.server.ts) — Project list + create/delete actions
- [apps/web/src/routes/projects/[id]/bible/+page.server.ts](../../apps/web/src/routes/projects/[id]/bible/+page.server.ts) — Bible CRUD actions
- [apps/web/src/routes/projects/[id]/workspace/+page.server.ts](../../apps/web/src/routes/projects/[id]/workspace/+page.server.ts) — Structure/content actions

### Problems with Current Approach

1. **UI and backend are coupled** — Can't reuse backend logic for CLI
2. **No real-time updates** — Full page reloads after mutations
3. **No streaming for LLM** — Generation blocks until complete
4. **Form actions are HTTP-only** — Can't use from non-browser clients
5. **Service instances created per-request** — No shared state/caching

## Target Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   SvelteKit Web UI  │     │   CLI/Terminal App  │
│   (Svelte 5)        │     │   (Node.js)         │
└─────────┬───────────┘     └──────────┬──────────┘
          │                            │
          │  WebSocket + JSON-RPC      │
          └──────────┬─────────────────┘
                     ▼
┌─────────────────────────────────────────────────────┐
│                 Spine Server                        │
├─────────────────────────────────────────────────────┤
│  WebSocket Handler                                  │
│  - Connection management                            │
│  - Request routing                                  │
│  - Subscription management                          │
├─────────────────────────────────────────────────────┤
│  API Layer (JSON-RPC style)                         │
│  - project.*  (list, create, load, delete)         │
│  - bible.*    (characters, locations, etc.)        │
│  - structure.* (tree, create, update, delete)      │
│  - content.*  (read, write, history)               │
│  - generation.* (start, cancel, status)            │
│  - review.*   (queue, actions, cascade)            │
│  - analytics.* (tension, presence, threads)        │
│  - serial.*   (buffer, hooks, mysteries)           │
├─────────────────────────────────────────────────────┤
│  @repo/core (unchanged domain logic)               │
│  @repo/llm (unchanged LLM client)                  │
└─────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Create Server Package

Create a new `packages/server` package to host the WebSocket server:

```
packages/server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Server entry point
│   ├── server.ts             # WebSocket server setup
│   ├── connection.ts         # Connection state management
│   ├── router.ts             # Request routing
│   ├── subscriptions.ts      # Real-time subscription manager
│   ├── protocol/
│   │   ├── types.ts          # Message types
│   │   ├── request.ts        # Request schema (Zod)
│   │   └── response.ts       # Response schema (Zod)
│   └── handlers/
│       ├── project.ts
│       ├── bible.ts
│       ├── structure.ts
│       ├── content.ts
│       ├── generation.ts
│       ├── review.ts
│       ├── analytics.ts
│       └── serial.ts
```

**Dependencies:**
- `ws` — WebSocket server library
- `@repo/core` — Domain logic
- `@repo/llm` — LLM client
- `@repo/types` — Shared types

### Phase 2: Define Protocol

Use JSON-RPC 2.0-style messages for simplicity and tooling compatibility.

#### Request Format

```typescript
interface Request {
  jsonrpc: '2.0';
  id: string | number;      // Correlation ID
  method: string;           // e.g., 'project.list', 'bible.character.create'
  params?: Record<string, unknown>;
}
```

#### Response Format

```typescript
interface Response {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;         // Success payload
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
```

#### Notification Format (Server → Client)

```typescript
interface Notification {
  jsonrpc: '2.0';
  method: string;           // e.g., 'generation.progress', 'content.updated'
  params: Record<string, unknown>;
}
```

### Phase 3: Define API Methods

#### Project Operations

| Method | Params | Returns |
|--------|--------|---------|
| `project.list` | — | `ProjectSummary[]` |
| `project.create` | `{ title, format, metadata? }` | `Project` |
| `project.load` | `{ id }` | `Project` |
| `project.delete` | `{ id }` | `{ success: boolean }` |
| `project.updateSettings` | `{ id, settings }` | `{ success: boolean }` |
| `project.updateMetadata` | `{ id, metadata }` | `{ success: boolean }` |

#### Bible Operations

| Method | Params | Returns |
|--------|--------|---------|
| `bible.get` | `{ projectId }` | `Bible` |
| `bible.character.list` | `{ projectId }` | `Character[]` |
| `bible.character.get` | `{ projectId, id }` | `Character` |
| `bible.character.create` | `{ projectId, data }` | `Character` |
| `bible.character.update` | `{ projectId, id, data }` | `Character` |
| `bible.character.delete` | `{ projectId, id }` | `{ success: boolean }` |
| *(similar for location, faction, worldRule, plotThread, timelineEvent)* |

#### Structure Operations

| Method | Params | Returns |
|--------|--------|---------|
| `structure.getTree` | `{ projectId }` | `Structure` |
| `structure.getAll` | `{ projectId }` | `Structure[]` |
| `structure.get` | `{ projectId, id }` | `Structure` |
| `structure.create` | `{ projectId, data }` | `Structure` |
| `structure.update` | `{ projectId, id, data }` | `Structure` |
| `structure.delete` | `{ projectId, id }` | `{ success: boolean }` |
| `structure.reorder` | `{ projectId, id, newOrder, newParentId? }` | `Structure` |
| `structure.addBeat` | `{ projectId, structureId, description, targetWordCount? }` | `Beat` |
| `structure.removeBeat` | `{ projectId, structureId, beatId }` | `{ success: boolean }` |
| `structure.setHook` | `{ projectId, structureId, hook? }` | `Structure` |

#### Content Operations

| Method | Params | Returns |
|--------|--------|---------|
| `content.get` | `{ projectId, structureId }` | `Content \| null` |
| `content.save` | `{ projectId, structureId, text }` | `Content` |
| `content.getHistory` | `{ projectId, structureId }` | `ContentVersion[]` |
| `content.rollback` | `{ projectId, structureId, versionId }` | `Content` |

#### Generation Operations (with streaming)

| Method | Params | Returns |
|--------|--------|---------|
| `generation.start` | `{ projectId, structureId, options? }` | `{ generationId }` |
| `generation.cancel` | `{ generationId }` | `{ success: boolean }` |
| `generation.status` | `{ generationId }` | `PipelineState` |
| `generation.retry` | `{ generationId, stage }` | `{ success: boolean }` |

**Streaming notifications:**
- `generation.progress` — Stage updates, token streaming
- `generation.complete` — Final result
- `generation.error` — Error occurred

#### Review Operations

| Method | Params | Returns |
|--------|--------|---------|
| `review.queue` | `{ projectId, status? }` | `ReviewQueueItem[]` |
| `review.getItem` | `{ projectId, contentId }` | `ReviewItem` |
| `review.submitAction` | `{ projectId, contentId, paragraphIndex, action }` | `{ success: boolean }` |
| `review.bulkApprove` | `{ projectId, contentIds }` | `{ success: boolean }` |
| `review.createLockPoint` | `{ projectId, structureId }` | `LockPoint` |
| `review.previewCascade` | `{ projectId, contentId }` | `CascadePreview` |
| `review.executeCascade` | `{ projectId, contentId }` | `{ success: boolean }` |

#### Analytics Operations

| Method | Params | Returns |
|--------|--------|---------|
| `analytics.tensionCurve` | `{ projectId, scope? }` | `TensionCurveData` |
| `analytics.characterPresence` | `{ projectId, scope? }` | `CharacterPresenceData` |
| `analytics.plotThreads` | `{ projectId, scope? }` | `PlotThreadTimeline` |
| `analytics.quality` | `{ projectId, scope? }` | `QualityMetrics` |

#### Serial Operations

| Method | Params | Returns |
|--------|--------|---------|
| `serial.bufferStatus` | `{ projectId }` | `BufferStatus` |
| `serial.releaseSchedule` | `{ projectId }` | `ReleaseSchedule` |
| `serial.hookPatterns` | `{ projectId, scope? }` | `HookPatternData` |
| `serial.cycleStatus` | `{ projectId, scope? }` | `CycleStatus` |
| `serial.mysteryBoard` | `{ projectId }` | `MysteryBoardData` |

### Phase 4: Subscription System

Enable real-time updates via subscriptions:

```typescript
// Subscribe to project changes
{ method: 'subscribe', params: { channel: 'project.updated', projectId: 'xxx' } }

// Subscribe to generation progress
{ method: 'subscribe', params: { channel: 'generation.progress', generationId: 'xxx' } }

// Subscribe to content changes (for collaborative future)
{ method: 'subscribe', params: { channel: 'content.updated', projectId: 'xxx' } }

// Unsubscribe
{ method: 'unsubscribe', params: { channel: 'project.updated', projectId: 'xxx' } }
```

### Phase 5: Create Client Package

Create `packages/client` for shared WebSocket client logic:

```
packages/client/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── client.ts            # WebSocket client wrapper
│   ├── types.ts             # Client-side types
│   └── api/
│       ├── project.ts       # project.* methods
│       ├── bible.ts         # bible.* methods
│       ├── structure.ts     # structure.* methods
│       ├── content.ts       # content.* methods
│       ├── generation.ts    # generation.* methods
│       ├── review.ts        # review.* methods
│       ├── analytics.ts     # analytics.* methods
│       └── serial.ts        # serial.* methods
```

**Client features:**
- Automatic reconnection
- Request/response correlation
- Subscription management
- TypeScript types for all methods
- Promise-based API

### Phase 6: Migrate Web App

Update the SvelteKit app to use the WebSocket client:

1. **Remove server-side data loading** — No more `+page.server.ts` files
2. **Add WebSocket connection** — Initialize in layout, share via context
3. **Use client-side data fetching** — Call API methods from components
4. **Handle real-time updates** — Update Svelte stores from subscriptions
5. **Streaming generation** — Show tokens as they arrive

**Migration pattern for each route:**

Before (server-side):
```typescript
// +page.server.ts
export const load = async ({ params, locals }) => {
  const project = locals.projectService.loadProject(params.id);
  return { project };
};

export const actions = {
  create: async ({ request, locals }) => {
    // Handle form submission
  },
};
```

After (client-side):
```svelte
<script lang="ts">
  import { getSpineClient } from '$lib/client';
  import { onMount } from 'svelte';

  const client = getSpineClient();
  let project = $state<Project | null>(null);

  onMount(async () => {
    project = await client.project.load({ id: $page.params.id });
  });

  async function handleCreate(data: CreateProjectData) {
    const newProject = await client.project.create(data);
    goto(`/projects/${newProject.id}`);
  }
</script>
```

### Phase 7: Create CLI Package

Create `apps/cli` for the terminal interface:

```
apps/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             # Entry point
│   ├── commands/
│   │   ├── project.ts       # project list, create, etc.
│   │   ├── bible.ts         # bible commands
│   │   ├── structure.ts     # structure commands
│   │   ├── generate.ts      # generation commands
│   │   └── review.ts        # review commands
│   ├── ui/
│   │   ├── prompts.ts       # Interactive prompts (inquirer)
│   │   ├── tables.ts        # Table formatting
│   │   └── progress.ts      # Progress bars
│   └── config.ts            # CLI configuration
```

**CLI features:**
- Interactive mode (menus, prompts)
- Batch mode (flags, piping)
- Streaming generation output
- Review queue browsing
- Quick status checks

## Migration Checklist

### Phase 1: Server Package
- [ ] Create `packages/server` package structure
- [ ] Implement WebSocket server with `ws`
- [ ] Define protocol types with Zod schemas
- [ ] Create request router
- [ ] Implement connection management

### Phase 2: Handler Implementation
- [ ] Implement `project.*` handlers
- [ ] Implement `bible.*` handlers
- [ ] Implement `structure.*` handlers
- [ ] Implement `content.*` handlers
- [ ] Implement `generation.*` handlers with streaming
- [ ] Implement `review.*` handlers
- [ ] Implement `analytics.*` handlers
- [ ] Implement `serial.*` handlers

### Phase 3: Subscription System
- [ ] Implement subscription manager
- [ ] Add subscription handlers
- [ ] Emit events from handlers
- [ ] Test real-time updates

### Phase 4: Client Package
- [ ] Create `packages/client` package structure
- [ ] Implement WebSocket client wrapper
- [ ] Implement typed API methods
- [ ] Add reconnection logic
- [ ] Add subscription management

### Phase 5: Web App Migration
- [ ] Add client initialization to layout
- [ ] Create Svelte stores for subscriptions
- [ ] Migrate project list page
- [ ] Migrate bible pages
- [ ] Migrate workspace page
- [ ] Migrate review pages
- [ ] Migrate analytics page
- [ ] Migrate serial page
- [ ] Migrate settings page
- [ ] Update tests

### Phase 6: CLI App
- [ ] Create `apps/cli` package structure
- [ ] Implement core commands
- [ ] Add interactive prompts
- [ ] Add streaming output
- [ ] Add configuration

## Technical Decisions

### Why WebSocket over HTTP?

1. **Streaming** — LLM generation benefits from real-time token streaming
2. **Bidirectional** — Server can push updates without polling
3. **Connection reuse** — Fewer connection setup costs
4. **CLI compatibility** — Works well for terminal apps

### Why JSON-RPC?

1. **Simple** — Easy to implement and debug
2. **Typed** — Request/response correlation built-in
3. **Tooling** — Standard format with existing libraries
4. **Familiar** — Similar to REST semantics

### Why Separate Client Package?

1. **Sharing** — Same client for web and CLI
2. **Testing** — Easier to mock for component tests
3. **Types** — Single source of truth for API types
4. **Updates** — Change API in one place

## Risks and Mitigations

### Connection Reliability
- **Risk:** WebSocket disconnects lose in-flight requests
- **Mitigation:** Implement retry with exponential backoff, persist pending requests

### State Synchronization
- **Risk:** Client state drifts from server
- **Mitigation:** Use subscriptions for real-time updates, periodic full refresh

### Error Handling
- **Risk:** Errors harder to debug than HTTP
- **Mitigation:** Structured error codes, request IDs for tracing

### Testing Complexity
- **Risk:** Harder to test than REST endpoints
- **Mitigation:** Mock WebSocket server for tests, integration tests with real server

### Performance
- **Risk:** Single connection bottleneck
- **Mitigation:** Connection pooling if needed, consider HTTP fallback for large uploads

## Dependencies

### New Packages

| Package | Purpose |
|---------|---------|
| `ws` | WebSocket server |
| `commander` | CLI argument parsing |
| `inquirer` | CLI interactive prompts |
| `chalk` | CLI colors |
| `ora` | CLI spinners |
| `cli-table3` | CLI table formatting |

### Version Compatibility

- Node.js 18+ (native WebSocket client)
- TypeScript 5.x
- Svelte 5 (runes mode)

## Future Considerations

### Multi-User Support
The WebSocket architecture enables future multi-user support:
- Session authentication
- Per-user subscriptions
- Conflict resolution

### Remote Server
Could run server on a different machine:
- Authentication layer
- HTTPS upgrade for WebSocket (WSS)
- Configurable server URL

### Plugin System
API could expose plugin hooks:
- Custom generation stages
- Additional analysis
- Export formats
