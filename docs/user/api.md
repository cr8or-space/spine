# WebSocket API Reference

Spine provides a WebSocket API for programmatic access to all features. This enables integration with CLI tools, MCP servers, and custom applications.

## Connection

Connect to the Spine server via WebSocket:

```
ws://localhost:8080
```

The server uses JSON-RPC 2.0 protocol for all communication.

## Protocol

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "project.list",
  "params": {}
}
```

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": [...]
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "error": {
    "code": -32001,
    "message": "Entity not found",
    "data": { "entityId": "..." }
  }
}
```

### Notification (Server to Client)

```json
{
  "jsonrpc": "2.0",
  "method": "generation.progress",
  "params": { "stage": "draft", "progress": 0.5 }
}
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | PARSE_ERROR | Invalid JSON |
| -32600 | INVALID_REQUEST | Invalid request structure |
| -32601 | METHOD_NOT_FOUND | Method does not exist |
| -32602 | INVALID_PARAMS | Invalid method parameters |
| -32603 | INTERNAL_ERROR | Server internal error |
| -32000 | PROJECT_NOT_FOUND | Project does not exist |
| -32001 | ENTITY_NOT_FOUND | Entity does not exist |
| -32002 | VALIDATION_ERROR | Data validation failed |
| -32003 | GENERATION_ERROR | Content generation failed |
| -32004 | REVIEW_ERROR | Review operation failed |
| -32005 | CONTENT_LOCKED | Content is locked for editing |
| -32006 | DATABASE_ERROR | Database operation failed |
| -32007 | LLM_ERROR | LLM service error |
| -32008 | SUBSCRIPTION_ERROR | Subscription operation failed |
| -32009 | UNAUTHORIZED | Not authorized |
| -32010 | RATE_LIMITED | Request rate exceeded |

---

## API Methods

### Project Operations

#### project.list

List all projects.

**Parameters:** None

**Returns:** `ProjectSummary[]`

```json
{
  "method": "project.list",
  "params": {}
}
```

#### project.create

Create a new project.

**Parameters:**
- `title` (string, required): Project title
- `format` (string, optional): `"web-serial"` | `"novel"` | `"short-story"`. Default: `"web-serial"`

**Returns:** `Project`

```json
{
  "method": "project.create",
  "params": { "title": "My Novel", "format": "web-serial" }
}
```

#### project.load

Load a project by ID.

**Parameters:**
- `id` (string, required): Project ID

**Returns:** `Project`

#### project.delete

Delete a project.

**Parameters:**
- `id` (string, required): Project ID

**Returns:** `{ success: boolean }`

#### project.updateSettings

Update project settings.

**Parameters:**
- `id` (string, required): Project ID
- `settings` (object): Settings to update
  - `llmConfig.baseUrl` (string): LLM API base URL
  - `llmConfig.apiKey` (string): LLM API key
  - `llmConfig.model` (string): Model name
  - `llmConfig.maxTokens` (number): Max tokens
  - `revisionHorizon` (number): Revision cascade limit
  - `tensionTolerance` (number): Acceptable tension deviation

**Returns:** `{ success: boolean }`

#### project.updateMetadata

Update project metadata.

**Parameters:**
- `id` (string, required): Project ID
- `metadata` (object): Metadata to update
  - `description` (string): Project description
  - `genre` (string): Genre
  - `targetWordCount` (number): Target word count

**Returns:** `{ success: boolean }`

---

### Bible Operations

The story bible contains all narrative entities: characters, locations, factions, world rules, plot threads, and timeline events.

#### bible.get

Get the full bible for a project.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `Bible`

### Character Entity

#### bible.character.list

List all characters.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `Character[]`

#### bible.character.get

Get a character by ID.

**Parameters:**
- `projectId` (string, required): Project ID
- `id` (string, required): Character ID

**Returns:** `Character`

#### bible.character.create

Create a character.

**Parameters:**
- `projectId` (string, required): Project ID
- `data` (object, required):
  - `name` (string, required): Character name
  - `role` (string, required): `"protagonist"` | `"antagonist"` | `"supporting"` | `"minor"`
  - `description` (string): Physical and personality description
  - `traits` (string[]): Character traits
  - `goals` (string[]): Character goals
  - `backstory` (string): Background history
  - `voiceNotes` (string): Voice and dialogue notes
  - `arcSummary` (string): Character arc summary

**Returns:** `Character`

#### bible.character.update

Update a character.

**Parameters:**
- `projectId` (string, required): Project ID
- `id` (string, required): Character ID
- `data` (object, required): Fields to update (same as create, all optional)

**Returns:** `Character`

#### bible.character.delete

Delete a character.

**Parameters:**
- `projectId` (string, required): Project ID
- `id` (string, required): Character ID

**Returns:** `{ success: boolean }`

### Location Entity

#### bible.location.list / get / create / update / delete

Same pattern as character. Create data:
- `name` (string, required): Location name
- `type` (string, required): `"world"` | `"continent"` | `"country"` | `"region"` | `"city"` | `"district"` | `"building"` | `"room"` | `"natural"` | `"virtual"` | `"other"`
- `description` (string): Visual description
- `atmosphere` (string): Mood and feel
- `significance` (string): Narrative importance
- `parentLocationId` (string): Parent location for nesting

### Faction Entity

#### bible.faction.list / get / create / update / delete

Same pattern. Create data:
- `name` (string, required): Faction name
- `type` (string, required): `"government"` | `"military"` | `"religious"` | `"criminal"` | `"corporate"` | `"secret-society"` | `"guild"` | `"family"` | `"informal"` | `"other"`
- `description` (string): Overview
- `goals` (string[]): Faction objectives
- `values` (string[]): Core values
- `structure` (string): Organizational structure

### World Rule Entity

#### bible.worldRule.list / get / create / update / delete

Same pattern. Create data:
- `name` (string, required): Rule name
- `category` (string, required): `"magic"` | `"physics"` | `"social"` | `"economic"` | `"other"`
- `description` (string): How the rule works
- `constraints` (string[]): Limitations
- `exceptions` (string[]): Edge cases

### Plot Thread Entity

#### bible.plotThread.list / get / create / update / delete

Same pattern. Create data:
- `name` (string, required): Thread name
- `type` (string, required): `"main-plot"` | `"subplot"` | `"mystery"` | `"romance"` | `"conflict"` | `"character-arc"` | `"worldbuilding"` | `"other"`
- `description` (string): Thread summary
- `status` (string): `"planned"` | `"active"` | `"dormant"` | `"resolved"` | `"abandoned"`
- `startChapter` (number): Starting chapter
- `endChapter` (number): Ending chapter (null if ongoing)

### Timeline Event Entity

#### bible.timelineEvent.list / get / create / update / delete

Same pattern. Create data:
- `name` (string, required): Event name
- `date` (string, required): In-world date
- `description` (string): What happened
- `significance` (string): `"major"` | `"moderate"` | `"minor"`
- `relatedCharacterIds` (string[]): Associated characters
- `relatedLocationIds` (string[]): Associated locations

---

### Structure Operations

Structure represents the hierarchical outline: Book > Arc > Chapter > Scene.

#### structure.getTree

Get the full structure tree.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `Structure` (root with nested children)

#### structure.getAll

Get all structures as a flat list.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `Structure[]`

#### structure.get

Get a single structure.

**Parameters:**
- `projectId` (string, required): Project ID
- `id` (string, required): Structure ID

**Returns:** `Structure`

#### structure.create

Create a structure node.

**Parameters:**
- `projectId` (string, required): Project ID
- `data` (object, required):
  - `title` (string, required): Node title
  - `type` (string, required): `"book"` | `"arc"` | `"chapter"` | `"scene"`
  - `parentId` (string): Parent structure ID
  - `order` (number): Position within siblings
  - `synopsis` (string): Brief summary
  - `tensionTarget` (number): Target tension level (0-100)
  - `chapterType` (string): `"action"` | `"character"` | `"worldbuilding"` | `"transition"`

**Returns:** `Structure`

#### structure.update

Update a structure.

**Parameters:**
- `projectId` (string, required): Project ID
- `id` (string, required): Structure ID
- `data` (object): Fields to update
  - `title` (string)
  - `synopsis` (string)
  - `tensionTarget` (number)
  - `chapterType` (string)

**Returns:** `Structure`

#### structure.delete

Delete a structure and its children.

**Parameters:**
- `projectId` (string, required): Project ID
- `id` (string, required): Structure ID

**Returns:** `{ success: boolean }`

#### structure.reorder

Move a structure to a new position.

**Parameters:**
- `projectId` (string, required): Project ID
- `id` (string, required): Structure ID
- `newOrder` (number, required): New position index
- `newParentId` (string): New parent ID (for reparenting)

**Returns:** `Structure`

#### structure.addBeat

Add a beat to a structure.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID
- `description` (string, required): Beat description
- `targetWordCount` (number): Word count target for this beat

**Returns:** `Beat`

#### structure.removeBeat

Remove a beat.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID
- `beatId` (string, required): Beat ID

**Returns:** `{ success: boolean }`

#### structure.setHook

Set the chapter hook.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID
- `hook` (object | null): Hook data
  - `type` (string, required): `"revelation"` | `"decision"` | `"cliffhanger"` | `"emotional"`
  - `description` (string): Hook description

**Returns:** `Structure`

---

### Content Operations

Content is the actual prose associated with structures.

#### content.get

Get content for a structure.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID

**Returns:** `Content | null`

#### content.save

Save content.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID
- `text` (string, required): Content text

**Returns:** `Content`

#### content.getHistory

Get version history.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID

**Returns:** `ContentVersion[]`

#### content.rollback

Rollback to a previous version.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID
- `versionNumber` (number, required): Version to restore

**Returns:** `Content`

---

### Generation Operations

LLM-powered content generation with streaming support.

#### generation.start

Start content generation.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID
- `options` (object):
  - `stage` (string): `"outline"` | `"beats"` | `"draft"` | `"review"`
  - `temperature` (number): LLM temperature
  - `maxTokens` (number): Max output tokens

**Returns:** `{ generationId: string }`

Subscribe to `generation.progress` for streaming updates.

#### generation.cancel

Cancel a running generation.

**Parameters:**
- `generationId` (string, required): Generation ID

**Returns:** `{ success: boolean }`

#### generation.status

Get generation status.

**Parameters:**
- `generationId` (string, required): Generation ID

**Returns:** `{ status: "running" | "completed" | "cancelled", pipelineState: PipelineState | null }`

#### generation.retry

Retry a failed generation stage.

**Parameters:**
- `generationId` (string, required): Generation ID
- `stage` (string, required): Stage to retry

**Returns:** `{ success: boolean }`

---

### Review Operations

Content review workflow with status transitions and lock points.

#### review.queue

Get the review queue.

**Parameters:**
- `projectId` (string, required): Project ID
- `status` (string): Filter by status: `"draft"` | `"in_review"` | `"approved"` | `"published"`

**Returns:** `ReviewQueueItem[]`

#### review.getItem

Get a review item.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string, required): Content ID

**Returns:** `Content`

#### review.submitAction

Submit a paragraph-level action.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string, required): Content ID
- `paragraphIndex` (number, required): Paragraph index
- `action` (string, required): `"accept"` | `"reject"` | `"regenerate"`

**Returns:** `ApplyActionResult`

#### review.bulkApprove

Approve multiple items.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentIds` (string[], required): Content IDs to approve

**Returns:** `{ succeeded: string[], failed: [{ contentId, reason }] }`

#### review.createLockPoint

Create a lock point to prevent revision cascades.

**Parameters:**
- `projectId` (string, required): Project ID
- `structureId` (string, required): Structure ID

**Returns:** `LockPoint`

#### review.removeLockPoint

Remove a lock point.

**Parameters:**
- `projectId` (string, required): Project ID
- `lockPointId` (string, required): Lock point ID

**Returns:** `{ success: boolean }`

#### review.getLockPoints

Get all lock points.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string): Filter by content

**Returns:** `LockPoint[]`

#### review.addComment

Add a review comment.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string, required): Content ID
- `comment` (object, required):
  - `paragraphIndex` (number, required): Paragraph to comment on
  - `text` (string, required): Comment text
  - `author` (string): Author name

**Returns:** `Content`

#### review.resolveComment

Resolve a comment.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string, required): Content ID
- `commentId` (string, required): Comment ID

**Returns:** `Content`

#### review.transitionStatus

Change content status.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string, required): Content ID
- `newStatus` (string, required): Target status
- `reason` (string): Transition reason

**Returns:** `StatusTransitionResult`

#### review.previewCascade

Preview revision cascade impact.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string, required): Content ID

**Returns:** `{ affectedStructures: string[], lockPoints: LockPoint[] }`

#### review.executeCascade

Execute revision cascade.

**Parameters:**
- `projectId` (string, required): Project ID
- `contentId` (string, required): Content ID

**Returns:** `{ success: boolean, affected: number }`

---

### Analytics Operations

Narrative analysis and tracking.

#### analytics.tensionCurve

Get tension curve data.

**Parameters:**
- `projectId` (string, required): Project ID
- `scope` (object): Filter scope
  - `bookId` (string): Limit to book
  - `arcId` (string): Limit to arc

**Returns:** `TensionCurveData | null`

#### analytics.characterPresence

Get character presence heatmap data.

**Parameters:**
- `projectId` (string, required): Project ID
- `scope` (object): Filter scope

**Returns:** `Record<string, CharacterTrackingData>`

#### analytics.plotThreads

Get plot thread timeline data.

**Parameters:**
- `projectId` (string, required): Project ID
- `scope` (object): Filter scope

**Returns:** `Record<string, PlotThreadTrackingData>`

#### analytics.quality

Get quality metrics.

**Parameters:**
- `projectId` (string, required): Project ID
- `scope` (object): Filter scope

**Returns:**
```json
{
  "averageTensionScore": 75,
  "averageHookStrength": 82,
  "continuityIssueCount": 3,
  "chaptersAnalyzed": 25,
  "chaptersWithIssues": 2
}
```

---

### Serial Operations

Web serial-specific features.

#### serial.bufferStatus

Get release buffer status.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `BufferStatus`

#### serial.releaseSchedule

Get release schedule.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:**
```json
{
  "schedule": [...],
  "nextReleaseDate": "2025-01-15",
  "releasesPerWeek": 3,
  "depletion": {
    "currentBuffer": 5,
    "depletionDate": "2025-02-01",
    "daysUntilDepletion": 17
  }
}
```

#### serial.hookPatterns

Analyze hook patterns.

**Parameters:**
- `projectId` (string, required): Project ID
- `scope` (object): Filter scope

**Returns:** `HookPatternResult`

#### serial.cycleStatus

Get tension cycle status.

**Parameters:**
- `projectId` (string, required): Project ID
- `scope` (object): Filter scope

**Returns:** `CycleEnforcementResult`

#### serial.mysteryBoard

Get mystery tracking board.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `Record<string, MysteryTrackingData>`

---

### Extraction Operations

LLM-powered entity extraction from content.

#### extraction.run

Run entity extraction on project content.

**Parameters:**
- `projectId` (string, required): Project ID
- `options` (object): Extraction options
  - `entityTypes` (string[]): Entity types to extract (`character`, `location`, `faction`, `world-rule`, `plot-thread`)
  - `reanalyze` (boolean): Re-analyze already processed content

**Returns:** `ExtractionResult`

```json
{
  "structuresAnalyzed": ["struct-1", "struct-2"],
  "suggestionsCreated": 5,
  "byType": { "new": 3, "update": 2 },
  "byEntityType": { "character": 2, "location": 1, "faction": 2 },
  "errors": []
}
```

#### extraction.suggestions

List entity suggestions.

**Parameters:**
- `projectId` (string, required): Project ID
- `status` (string): Filter by status: `"pending"` | `"accepted"` | `"rejected"` | `"merged"`
- `entityType` (string): Filter by entity type

**Returns:** `SuggestionSummary[]`

#### extraction.suggestion

Get suggestion details.

**Parameters:**
- `suggestionId` (string, required): Suggestion ID

**Returns:** `EntitySuggestion`

#### extraction.accept

Accept a suggestion.

**Parameters:**
- `suggestionId` (string, required): Suggestion ID
- `reviewNotes` (string): Optional review notes

**Returns:** `AcceptResult`

#### extraction.reject

Reject a suggestion.

**Parameters:**
- `suggestionId` (string, required): Suggestion ID
- `reviewNotes` (string): Optional review notes

**Returns:** `EntitySuggestion`

#### extraction.pendingCount

Get count of pending suggestions.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `{ count: number }`

#### extraction.cleanup

Clean up old reviewed suggestions.

**Parameters:**
- `projectId` (string, required): Project ID
- `days` (number): Remove suggestions older than days (default: 30)

**Returns:** `{ deleted: number }`

---

### System Operations

Health monitoring, integrity checking, and backup management.

#### system.health

Get system health summary.

**Parameters:** None

**Returns:** `HealthSummary`

```json
{
  "isHealthy": true,
  "pendingOperations": 0,
  "recentErrors": 0,
  "lastBackup": "2025-01-15T10:00:00Z",
  "lastIntegrityCheck": "2025-01-15T09:00:00Z"
}
```

#### system.integrityCheck

Run full database integrity check.

**Parameters:** None

**Returns:** `IntegrityCheckResult`

```json
{
  "isValid": true,
  "checks": [{ "checkType": "foreign_keys", "status": "ok" }],
  "errors": [],
  "warnings": []
}
```

#### system.healthChecks

Get recent health check results.

**Parameters:**
- `limit` (number): Max results to return (default: 50)

**Returns:** `HealthCheckResult[]`

#### system.repair

Attempt to repair detected issues.

**Parameters:** None

**Returns:** `{ repaired: number, failed: number }`

#### system.recoverableOperations

Get operations that can be recovered.

**Parameters:** None

**Returns:** `OperationJournalEntry[]`

#### system.operations

Get operations for a project.

**Parameters:**
- `projectId` (string, required): Project ID
- `status` (string): Filter by status: `"pending"` | `"in_progress"` | `"completed"` | `"failed"` | `"cancelled"`

**Returns:** `OperationJournalEntry[]`

#### system.recover

Attempt to recover pending operations.

**Parameters:** None

**Returns:** `RecoveryResult`

#### system.cancelOperation

Cancel an operation.

**Parameters:**
- `operationId` (string, required): Operation ID

**Returns:** `OperationJournalEntry | undefined`

#### system.createBackup

Create a database backup.

**Parameters:**
- `name` (string): Optional backup name

**Returns:** `BackupRecord`

#### system.listBackups

List all backups.

**Parameters:** None

**Returns:** `BackupRecord[]`

#### system.verifyBackup

Verify backup integrity.

**Parameters:**
- `backupId` (string, required): Backup ID

**Returns:** `{ valid: boolean, error?: string }`

#### system.deleteBackup

Delete a backup.

**Parameters:**
- `backupId` (string, required): Backup ID

**Returns:** `{ success: boolean }`

#### system.exportProject

Export project data to JSON.

**Parameters:**
- `projectId` (string, required): Project ID

**Returns:** `Record<string, unknown>` (full project data)

#### system.cleanup

Clean up old operation journal entries and excess backups.

**Parameters:** None

**Returns:** `{ journalEntries: number, backups: number }`

---

## Subscriptions

Subscribe to real-time updates using subscription methods.

### subscribe

Subscribe to a channel.

**Parameters:**
- `channel` (string, required): Channel name
- `projectId` (string): Project filter
- `generationId` (string): Generation filter

```json
{
  "method": "subscribe",
  "params": { "channel": "generation.progress", "generationId": "gen-123" }
}
```

### unsubscribe

Unsubscribe from a channel.

```json
{
  "method": "unsubscribe",
  "params": { "channel": "generation.progress", "generationId": "gen-123" }
}
```

### Channels

| Channel | Description | Params |
|---------|-------------|--------|
| `project.updated` | Project changes | `projectId` |
| `bible.updated` | Bible entity changes | `projectId` |
| `structure.updated` | Structure changes | `projectId` |
| `content.updated` | Content changes | `projectId` |
| `generation.progress` | Generation stage updates | `generationId` |
| `generation.complete` | Generation finished | `generationId` |
| `generation.error` | Generation failed | `generationId` |
| `review.updated` | Review status changes | `projectId` |

---

## Client Libraries

### TypeScript/JavaScript

Use the `@repo/client` package:

```typescript
import { createFullClient } from '@repo/client';

const client = createFullClient({ url: 'ws://localhost:8080' });
await client.connect();

// List projects
const projects = await client.project.list();

// Create a character
const character = await client.bible.character.create(projectId, {
  name: 'Alice',
  role: 'protagonist',
  description: 'A curious adventurer'
});

// Subscribe to generation progress
client.subscribe(
  { channel: 'generation.progress', generationId },
  (params) => console.log('Progress:', params)
);

// Start generation
const { generationId } = await client.generation.start(projectId, structureId);
```

### Configuration

```typescript
const client = createFullClient({
  url: 'ws://localhost:8080',
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  requestTimeout: 30000,
  onConnect: () => console.log('Connected'),
  onDisconnect: (reason) => console.log('Disconnected:', reason),
  onError: (error) => console.error('Error:', error)
});
```
