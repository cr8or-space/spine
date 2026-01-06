# Serial MCP Server

The Serial MCP (Model Context Protocol) server exposes web serial authoring functionality as tools for LLM interaction. This enables AI assistants like Claude to work directly with your serial projects - managing story bibles, structure, content, and more.

## Installation

The MCP server is installed as part of the Spine monorepo:

```bash
cd packages/serial/mcp
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
| `SERIAL_SERVER_URL` | `ws://localhost:8080` | Serial WebSocket server URL |
| `SERIAL_AUTO_RECONNECT` | `true` | Auto-reconnect on disconnect |
| `SERIAL_RECONNECT_DELAY` | `1000` | Reconnect delay in ms |
| `SERIAL_REQUEST_TIMEOUT` | `30000` | Request timeout in ms |

### Config File

Create `~/.config/spine-serial/mcp.json`:

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

Add the Serial MCP server to your Claude Desktop configuration:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "serial": {
      "command": "node",
      "args": ["/path/to/spine/packages/serial/mcp/dist/index.js"],
      "env": {
        "SERIAL_SERVER_URL": "ws://localhost:8080"
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
| `serial_project_list` | List all projects |
| `serial_project_create` | Create a new project |
| `serial_project_load` | Load a project into session |
| `serial_project_delete` | Delete a project (requires confirmation) |
| `serial_session_status` | Show current session state |
| `serial_project_settings` | Update project settings |

### Bible Tools

| Tool | Description |
|------|-------------|
| `serial_bible_get` | Get the full story bible |
| `serial_bible_character_list` | List all characters |
| `serial_bible_character_create` | Create a new character |
| `serial_bible_character_update` | Update a character |
| `serial_bible_character_delete` | Delete a character |
| `serial_bible_location_list` | List all locations |
| `serial_bible_location_create` | Create a new location |
| `serial_bible_faction_list` | List all factions |
| `serial_bible_faction_create` | Create a new faction |
| `serial_bible_thread_list` | List plot threads |
| `serial_bible_thread_create` | Create a plot thread |
| `serial_bible_rule_list` | List world rules |
| `serial_bible_rule_create` | Create a world rule |
| `serial_bible_timeline` | List timeline events |
| `serial_bible_event_create` | Create a timeline event |

### Structure Tools

| Tool | Description |
|------|-------------|
| `serial_structure_tree` | Get hierarchical structure tree |
| `serial_structure_list` | Get flat list of structures |
| `serial_structure_get` | Get a specific structure |
| `serial_structure_create` | Create a new structure |
| `serial_structure_update` | Update structure properties |
| `serial_structure_delete` | Delete a structure and children |
| `serial_structure_select` | Select structure for session |
| `serial_structure_reorder` | Move structure to new position |
| `serial_structure_add_beat` | Add a beat to a chapter |
| `serial_structure_remove_beat` | Remove a beat |
| `serial_structure_set_hook` | Set chapter hook |
| `serial_structure_clear_hook` | Clear chapter hook |

### Content Tools

| Tool | Description |
|------|-------------|
| `serial_content_get` | Get content for a structure |
| `serial_content_save` | Save content text |
| `serial_content_history` | Get version history |
| `serial_content_rollback` | Restore previous version |
| `serial_content_export` | Export chapters to markdown files |

### Generation Tools

| Tool | Description |
|------|-------------|
| `serial_generate_start` | Start content generation |
| `serial_generate_status` | Check generation status |
| `serial_generate_cancel` | Cancel running generation |
| `serial_generate_retry` | Retry failed stage |

### Review Tools

| Tool | Description |
|------|-------------|
| `serial_review_queue` | Get content review queue |
| `serial_review_get` | Get content for review |
| `serial_review_approve` | Approve content |
| `serial_review_publish` | Publish approved content |
| `serial_review_reject` | Reject content with reason |
| `serial_review_bulk_approve` | Batch approve content |
| `serial_review_lock` | Create a lock point |
| `serial_review_unlock` | Remove a lock point |
| `serial_review_locks` | List all lock points |
| `serial_review_comment` | Add review comment |
| `serial_review_cascade_preview` | Preview revision cascade |
| `serial_review_cascade_execute` | Execute revision cascade |

### Analytics Tools

| Tool | Description |
|------|-------------|
| `serial_analytics_tension` | Get tension curve data |
| `serial_analytics_characters` | Get character presence data |
| `serial_analytics_threads` | Get plot thread timeline |
| `serial_analytics_quality` | Get quality metrics |

### Serial Tools

| Tool | Description |
|------|-------------|
| `serial_serial_buffer` | Get release buffer status |
| `serial_serial_schedule` | Get release schedule |
| `serial_serial_hooks` | Analyze hook patterns |
| `serial_serial_cycle` | Get tension cycle status |
| `serial_serial_mysteries` | Get mystery tracking board |

### Extraction Tools

| Tool | Description |
|------|-------------|
| `serial_extraction_run` | Run entity extraction on content |
| `serial_extraction_suggestions` | List entity suggestions |
| `serial_extraction_show` | Show suggestion details |
| `serial_extraction_accept` | Accept a suggestion |
| `serial_extraction_reject` | Reject a suggestion |
| `serial_extraction_pending_count` | Get pending suggestion count |
| `serial_extraction_cleanup` | Clean up old suggestions |

### System Tools

| Tool | Description |
|------|-------------|
| `serial_system_health` | Get system health summary |
| `serial_system_integrity_check` | Run full integrity check |
| `serial_system_repair` | Repair detected issues |
| `serial_system_recoverable_operations` | List recoverable operations |
| `serial_system_recover` | Recover pending operations |
| `serial_system_backup` | Create database backup |
| `serial_system_list_backups` | List all backups |
| `serial_system_verify_backup` | Verify backup integrity |
| `serial_system_delete_backup` | Delete a backup |
| `serial_system_cleanup` | Clean up old data |

## Session Context

The MCP server maintains session context to avoid requiring IDs on every call:

1. **Load a project** with `serial_project_load` - sets `currentProjectId`
2. **Select a structure** with `serial_structure_select` - sets `currentStructureId`
3. Subsequent tools use these values automatically

You can always override by passing explicit IDs:

```
serial_bible_get { "projectId": "specific-project-id" }
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

### Exporting Content

Export chapters or scenes to markdown files for reading, sharing, or backup:

```
serial_content_export { "outputDir": "/path/to/output" }
```

**Parameters:**
- `outputDir` (required): Directory to write files (created if it doesn't exist)
- `structureType`: `"chapter"` (default), `"scene"`, or `"all"`
- `includeMetadata`: Include YAML frontmatter (default: true)
- `projectId`: Uses current project if not specified

**Output format:**
- Files are named `NN-title-slug.md` (e.g., `00-chapter-1-the-awakening.md`)
- YAML frontmatter includes title, type, parent path, status, and word count
- Content follows as standard markdown

Example prompts:
- "Export all chapters to /home/user/novel-export"
- "Export just the scenes to ./scenes without metadata"

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
| `No project loaded` | Use `serial_project_load` first |
| `No structure selected` | Use `serial_structure_select` first |
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

1. Check session status with `serial_session_status`
2. Verify you have a project loaded
3. For structure operations, verify a structure is selected

### Missing Data

1. Bible operations require entities to be created first
2. Analytics require content with analysis data
3. Serial features require a web-serial format project
