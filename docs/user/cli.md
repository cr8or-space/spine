# Spine CLI

The Spine CLI provides a command-line interface for managing web serial projects. It connects to a Spine server via WebSocket and provides commands for all core operations.

## Installation

The CLI is installed as part of the Spine monorepo:

```bash
cd apps/cli
pnpm install
pnpm build
```

After building, link the CLI globally:

```bash
pnpm link --global
```

Or run directly with:

```bash
pnpm dev -- <command>
```

## Configuration

The CLI stores configuration in `~/.config/spine/cli.json`.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | string | `ws://localhost:8080` | WebSocket server URL |
| `defaultProject` | string | - | Default project ID to use |
| `outputFormat` | string | `table` | Output format: `table`, `json`, or `plain` |
| `color` | boolean | `true` | Enable colored output |

### Managing Configuration

```bash
# Show current configuration
spine config show

# Set a configuration value
spine config set serverUrl ws://example.com:8080
spine config set outputFormat json
spine config set color false

# Get a specific value
spine config get serverUrl

# Reset to defaults
spine config reset

# Show config file path
spine config path
```

## Commands

### Project Management

Manage your Spine projects.

```bash
# List all projects
spine project list

# Create a new project
spine project create
spine project create --name "My Novel" --description "A fantasy epic"

# Show project details
spine project show <id>

# Select default project
spine project select <id>

# Delete a project
spine project delete <id>
spine project delete <id> --force  # Skip confirmation
```

### Story Bible

View and manage the story bible for your project.

```bash
# Show bible overview
spine bible show
spine bible show --project <id>

# List characters
spine bible characters

# List locations
spine bible locations

# List plot threads
spine bible threads

# Add a new character (interactive)
spine bible add-character
```

### Structure

View and manage the story structure (books, arcs, chapters, scenes).

```bash
# Show structure tree
spine structure tree
spine structure tree --depth 3

# List structure elements
spine structure list
spine structure list --type chapter
spine structure list --parent <id>

# Create a new structure element
spine structure create
spine structure create --type arc --title "The Beginning"

# Show element details
spine structure show <id>
```

### Content

View and manage prose content.

```bash
# View content for a structure element
spine content view <id>

# Edit content (opens editor)
spine content edit <id>

# View content history
spine content history <id>

# Rollback to a previous version
spine content rollback <id> --version 3
```

### Generation

Generate content using LLM assistance.

```bash
# Start generation for a structure element
spine generate start <structureId>
spine generate start <structureId> --style "action-packed" --tone "suspenseful"

# Check generation status
spine generate status

# Cancel ongoing generation
spine generate cancel
```

Generation progress is displayed in real-time with a progress indicator showing the current status and any streaming output.

### Review

Manage the content review workflow.

```bash
# View review queue
spine review queue
spine review queue --status draft
spine review queue --status in-review
spine review queue --status approved

# Show review details
spine review show <id>

# Transition review status
spine review transition <id> --to in-review
spine review transition <id> --to approved

# Quick approve
spine review approve <id>
spine review approve <id> --notes "Great chapter!"

# Bulk approve multiple items
spine review bulk-approve <id1> <id2> <id3>

# View lock points
spine review locks
```

## Output Formats

The CLI supports three output formats controlled by the `outputFormat` configuration:

### Table (default)

Displays data in formatted ASCII tables with headers and borders.

```
┌─────────┬──────────────────┬────────────────┐
│ ID      │ Name             │ Status         │
├─────────┼──────────────────┼────────────────┤
│ proj-1  │ My Novel         │ active         │
│ proj-2  │ Short Stories    │ completed      │
└─────────┴──────────────────┴────────────────┘
```

### JSON

Outputs data as formatted JSON, useful for scripting and automation.

```json
[
  {
    "id": "proj-1",
    "name": "My Novel",
    "status": "active"
  }
]
```

### Plain

Tab-separated values without headers or formatting.

```
proj-1	My Novel	active
proj-2	Short Stories	completed
```

## Color Output

Color output is enabled by default. Disable it for cleaner scripting:

```bash
spine config set color false
```

Or pipe through standard output processing:

```bash
spine project list | cat  # Color is auto-disabled for pipes
```

## Server Connection

The CLI connects to a Spine server via WebSocket. Ensure the server is running before using CLI commands.

Start the server (from the server package):

```bash
cd packages/server
pnpm dev
```

Configure the CLI to connect to a specific server:

```bash
spine config set serverUrl ws://localhost:8080
```

## Examples

### Complete Workflow

```bash
# 1. Create a new project
spine project create --name "The Adventures of Hero" --description "Epic fantasy"

# 2. Select the project
spine project select proj-abc123

# 3. View the bible
spine bible show

# 4. Add characters
spine bible add-character

# 5. View structure
spine structure tree

# 6. Create a new chapter
spine structure create --type chapter --title "The Beginning"

# 7. Generate initial content
spine generate start struct-xyz789

# 8. Review and approve
spine review queue
spine review approve cont-123456
```

### Scripting with JSON Output

```bash
# Get all projects as JSON
spine config set outputFormat json
spine project list > projects.json

# Process with jq
spine project list | jq '.[] | select(.status == "active")'
```

## Troubleshooting

### Connection Issues

If you see connection errors:

1. Verify the server is running
2. Check the server URL: `spine config get serverUrl`
3. Test WebSocket connectivity to the server port

### Permission Errors

If you see permission errors for the config file:

```bash
chmod 700 ~/.config/spine
chmod 600 ~/.config/spine/cli.json
```

### Reset Configuration

If configuration becomes corrupted:

```bash
spine config reset
```

Or manually delete the config file:

```bash
rm ~/.config/spine/cli.json
```
