# Spine MCP Server

The Spine MCP (Model Context Protocol) server exposes Spine functionality as tools for LLM interaction. This enables AI assistants like Claude to work directly with your Spine projects - managing story bibles, structure, content, and more.

## Installation

The MCP server is installed as part of the Spine monorepo:

```bash
cd packages/mcp
pnpm install
pnpm build
```

After building, you can run the server with:

```bash
pnpm start
# or
node dist/index.js
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPINE_SERVER_URL` | `ws://localhost:8080` | Spine WebSocket server URL |
| `SPINE_AUTO_RECONNECT` | `true` | Auto-reconnect on disconnect |
| `SPINE_RECONNECT_DELAY` | `1000` | Reconnect delay in ms |
| `SPINE_REQUEST_TIMEOUT` | `30000` | Request timeout in ms |

### Config File

Create `~/.config/spine/mcp.json`:

```json
{
  "serverUrl": "ws://localhost:8080",
  "autoReconnect": true,
  "reconnectDelay": 1000,
  "requestTimeout": 30000
}
```

Configuration priority: Environment variables > Config file > Defaults.

## Setting Up with Claude Desktop

Add the Spine MCP server to your Claude Desktop configuration:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "spine": {
      "command": "node",
      "args": ["/path/to/spine/packages/mcp/dist/index.js"],
      "env": {
        "SPINE_SERVER_URL": "ws://localhost:8080"
      }
    }
  }
}
```

### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json` with the same structure.

## Available Tools

The MCP server provides 60+ tools organized into categories:

### Project Tools

| Tool | Description |
|------|-------------|
| `spine_project_list` | List all projects |
| `spine_project_create` | Create a new project |
| `spine_project_load` | Load a project into session |
| `spine_project_delete` | Delete a project (requires confirmation) |
| `spine_session_status` | Show current session state |
| `spine_project_settings` | Update project settings |

### Bible Tools

| Tool | Description |
|------|-------------|
| `spine_bible_get` | Get the full story bible |
| `spine_bible_character_list` | List all characters |
| `spine_bible_character_create` | Create a new character |
| `spine_bible_character_update` | Update a character |
| `spine_bible_character_delete` | Delete a character |
| `spine_bible_location_list` | List all locations |
| `spine_bible_location_create` | Create a new location |
| `spine_bible_faction_list` | List all factions |
| `spine_bible_faction_create` | Create a new faction |
| `spine_bible_thread_list` | List plot threads |
| `spine_bible_thread_create` | Create a plot thread |
| `spine_bible_rule_list` | List world rules |
| `spine_bible_rule_create` | Create a world rule |
| `spine_bible_timeline` | List timeline events |
| `spine_bible_event_create` | Create a timeline event |

### Structure Tools

| Tool | Description |
|------|-------------|
| `spine_structure_tree` | Get hierarchical structure tree |
| `spine_structure_list` | Get flat list of structures |
| `spine_structure_get` | Get a specific structure |
| `spine_structure_create` | Create a new structure |
| `spine_structure_update` | Update structure properties |
| `spine_structure_delete` | Delete a structure and children |
| `spine_structure_select` | Select structure for session |
| `spine_structure_reorder` | Move structure to new position |
| `spine_structure_add_beat` | Add a beat to a chapter |
| `spine_structure_remove_beat` | Remove a beat |
| `spine_structure_set_hook` | Set chapter hook |
| `spine_structure_clear_hook` | Clear chapter hook |

### Content Tools

| Tool | Description |
|------|-------------|
| `spine_content_get` | Get content for a structure |
| `spine_content_save` | Save content text |
| `spine_content_history` | Get version history |
| `spine_content_rollback` | Restore previous version |

### Generation Tools

| Tool | Description |
|------|-------------|
| `spine_generate_start` | Start content generation |
| `spine_generate_status` | Check generation status |
| `spine_generate_cancel` | Cancel running generation |
| `spine_generate_retry` | Retry failed stage |

### Review Tools

| Tool | Description |
|------|-------------|
| `spine_review_queue` | Get content review queue |
| `spine_review_get` | Get content for review |
| `spine_review_approve` | Approve content |
| `spine_review_publish` | Publish approved content |
| `spine_review_reject` | Reject content with reason |
| `spine_review_bulk_approve` | Batch approve content |
| `spine_review_lock` | Create a lock point |
| `spine_review_unlock` | Remove a lock point |
| `spine_review_locks` | List all lock points |
| `spine_review_comment` | Add review comment |
| `spine_review_cascade_preview` | Preview revision cascade |
| `spine_review_cascade_execute` | Execute revision cascade |

### Analytics Tools

| Tool | Description |
|------|-------------|
| `spine_analytics_tension` | Get tension curve data |
| `spine_analytics_characters` | Get character presence data |
| `spine_analytics_threads` | Get plot thread timeline |
| `spine_analytics_quality` | Get quality metrics |

### Serial Tools

| Tool | Description |
|------|-------------|
| `spine_serial_buffer` | Get release buffer status |
| `spine_serial_schedule` | Get release schedule |
| `spine_serial_hooks` | Analyze hook patterns |
| `spine_serial_cycle` | Get tension cycle status |
| `spine_serial_mysteries` | Get mystery tracking board |

### Extraction Tools

| Tool | Description |
|------|-------------|
| `spine_extraction_run` | Run entity extraction on content |
| `spine_extraction_suggestions` | List entity suggestions |
| `spine_extraction_show` | Show suggestion details |
| `spine_extraction_accept` | Accept a suggestion |
| `spine_extraction_reject` | Reject a suggestion |
| `spine_extraction_pending_count` | Get pending suggestion count |
| `spine_extraction_cleanup` | Clean up old suggestions |

### System Tools

| Tool | Description |
|------|-------------|
| `spine_system_health` | Get system health summary |
| `spine_system_integrity_check` | Run full integrity check |
| `spine_system_repair` | Repair detected issues |
| `spine_system_recoverable_operations` | List recoverable operations |
| `spine_system_recover` | Recover pending operations |
| `spine_system_backup` | Create database backup |
| `spine_system_list_backups` | List all backups |
| `spine_system_verify_backup` | Verify backup integrity |
| `spine_system_delete_backup` | Delete a backup |
| `spine_system_cleanup` | Clean up old data |

## Session Context

The MCP server maintains session context to avoid requiring IDs on every call:

1. **Load a project** with `spine_project_load` - sets `currentProjectId`
2. **Select a structure** with `spine_structure_select` - sets `currentStructureId`
3. Subsequent tools use these values automatically

You can always override by passing explicit IDs:

```
spine_bible_get { "projectId": "specific-project-id" }
```

## Usage Examples

Here are example prompts you can use with Claude:

### Getting Started

"List all my Spine projects"
"Create a new web serial project called 'The Dragon's Quest'"
"Show me the story bible for the current project"

### World Building

"Add a protagonist character named Elena who is a dragon rider"
"Create a location called 'Dragon Spire' - an ancient tower where dragons nest"
"Add a main plot thread about an ancient prophecy"

### Structure Planning

"Show me the outline for this book"
"Create an arc called 'The Awakening' with 5 chapters"
"Set the tension target for Chapter 3 to 75"
"Add a cliffhanger hook to Chapter 2"

### Content Management

"Show me the content for Chapter 1"
"What's the version history for this chapter?"
"Roll back to version 2"

### Analytics

"What's the tension curve looking like for this book?"
"Show me where my characters appear across chapters"
"What plot threads are currently active?"
"What's my release buffer status?"

### Review Workflow

"Show me the review queue"
"Approve Chapter 5"
"Create a lock point on Chapter 10"
"Preview the revision cascade for this chapter"

### Entity Extraction

"Run extraction to find new characters from the latest chapters"
"Show me pending entity suggestions"
"Accept the suggestion for character 'Marcus'"
"How many entity suggestions are pending review?"

### System & Backup

"Check the system health"
"Create a backup of the database"
"Show me available backups"
"Run an integrity check"

## Error Handling

Tools return descriptive error messages:

| Error | Meaning |
|-------|---------|
| `No project loaded` | Use `spine_project_load` first |
| `No structure selected` | Use `spine_structure_select` first |
| `Project not found` | Invalid project ID |
| `Entity not found` | Invalid character/location/etc. ID |
| `Content locked` | Content is protected from changes |
| `Deletion not confirmed` | Set `confirm: true` for destructive operations |

## Requirements

- Spine server running at the configured URL
- Node.js 18+
- Claude Desktop or other MCP-compatible client

## Troubleshooting

### Connection Issues

1. Ensure the Spine server is running:
   ```bash
   # Using the standalone server (recommended for MCP/CLI)
   cd apps/server && pnpm dev
   # Or: pnpm start (after building)

   # Alternatively, the web app also serves the API
   cd apps/web && pnpm dev
   ```

2. Check the server URL in your configuration (default: ws://localhost:8080)

3. Look for connection logs in the MCP server output

### Tool Errors

1. Check session status with `spine_session_status`
2. Verify you have a project loaded
3. For structure operations, verify a structure is selected

### Missing Data

1. Bible operations require entities to be created first
2. Analytics require content with analysis data
3. Serial features require a web-serial format project
