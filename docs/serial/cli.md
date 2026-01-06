# Serial CLI

The Serial CLI provides a command-line interface for managing web serial projects. It connects to a Serial server via WebSocket and provides commands for all core operations.

## Installation

The CLI is installed as part of the Spine monorepo:

```bash
cd apps/serial-cli
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

The CLI stores configuration in `~/.config/spine-serial/serial-cli.json`.

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
serial config show

# Set a configuration value
serial config set serverUrl ws://example.com:8080
serial config set outputFormat json
serial config set color false

# Get a specific value
serial config get serverUrl

# Reset to defaults
serial config reset

# Show config file path
serial config path
```

## Commands

### Project Management

Manage your Spine projects.

```bash
# List all projects
serial project list

# Create a new project
serial project create
serial project create --name "My Novel" --description "A fantasy epic"

# Show project details
serial project show <id>

# Select default project
serial project select <id>

# Delete a project
serial project delete <id>
serial project delete <id> --force  # Skip confirmation
```

### Story Bible

View and manage the story bible for your project.

```bash
# Show bible overview
serial bible show
serial bible show --project <id>

# List characters
serial bible characters

# List locations
serial bible locations

# List factions
serial bible factions

# List world rules
serial bible rules

# List plot threads
serial bible threads

# List timeline events
serial bible timeline

# Add a new character (interactive or with options)
serial bible add-character
serial bible add-character --name "Hero" --role protagonist

# Add a new location
serial bible add-location
serial bible add-location --name "Castle" --type building

# Add a new faction
serial bible add-faction
serial bible add-faction --name "The Guild" --type organization

# Add a new world rule
serial bible add-rule
serial bible add-rule --name "Magic Costs Energy" --category magic

# Add a new plot thread
serial bible add-thread
serial bible add-thread --name "Main Quest" --type main

# Add a timeline event
serial bible add-event
serial bible add-event --name "The Great War" --date "Year 100" --significance major
```

### Structure

View and manage the story structure (books, arcs, chapters, scenes).

```bash
# Show structure tree
serial structure tree
serial structure tree --depth 2          # Limit display depth
serial structure tree --depth 0          # Show root only

# List structure elements
serial structure list
serial structure list --type chapter      # Filter by type
serial structure list --parent <id>       # Filter by parent

# Create a new structure element
serial structure create
serial structure create --type arc --title "The Beginning"

# Show element details
serial structure show <id>

# Update structure properties
serial structure update <id> --title "New Title"
serial structure update <id> --synopsis "Chapter summary"
serial structure update <id> --tension 75
serial structure update <id> --chapter-type action
```

### Content

View and manage prose content.

```bash
# View content for a structure element
serial content view <id>

# Edit content (opens editor)
serial content edit <id>

# View content history
serial content history <id>

# Rollback to a previous version
serial content rollback <id> --version 3
```

### Generation

Generate content using LLM assistance.

```bash
# Start generation for a structure element
serial generate start <structureId>
serial generate start <structureId> --style "action-packed" --tone "suspenseful"

# Check generation status
serial generate status

# Cancel ongoing generation
serial generate cancel
```

Generation progress is displayed in real-time with a progress indicator showing the current status and any streaming output.

### Review

Manage the content review workflow.

```bash
# View review queue
serial review queue
serial review queue --status draft
serial review queue --status in-review
serial review queue --status approved

# Show review details
serial review show <id>

# Transition review status
serial review transition <id> --to in-review
serial review transition <id> --to approved

# Quick approve
serial review approve <id>
serial review approve <id> --notes "Great chapter!"

# Bulk approve multiple items
serial review bulk-approve <id1> <id2> <id3>

# View lock points
serial review locks
```

### Analytics

View project analytics and insights for pacing, characters, and plot threads.

```bash
# View tension curve data
serial analytics tension
serial analytics tension --book <id>      # Filter by book
serial analytics tension --arc <id>       # Filter by arc

# View character presence data
serial analytics characters
serial analytics chars                    # Alias

# View plot thread timeline
serial analytics threads

# View quality metrics
serial analytics quality
```

### Serial

Manage web serial publishing features including buffer, schedule, hooks, and mysteries.

```bash
# View buffer status and health
serial release buffer

# View release schedule and deadlines
serial release schedule

# View hook patterns and variety warnings
serial release hooks
serial release hooks --book <id>

# View tension cycle status
serial release cycle

# View mystery board with clue tracking
serial release mysteries
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
serial project list | cat  # Color is auto-disabled for pipes
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
serial project create --name "The Adventures of Hero" --description "Epic fantasy"

# 2. Select the project
serial project select proj-abc123

# 3. View the bible
serial bible show

# 4. Add characters
serial bible add-character

# 5. View structure
serial structure tree

# 6. Create a new chapter
serial structure create --type chapter --title "The Beginning"

# 7. Generate initial content
serial generate start struct-xyz789

# 8. Review and approve
serial review queue
serial review approve cont-123456
```

### Scripting with JSON Output

```bash
# Get all projects as JSON
spine config set outputFormat json
serial project list > projects.json

# Process with jq
serial project list | jq '.[] | select(.status == "active")'
```

## Example: "The Accident" Web Serial

This complete example demonstrates setting up and managing a web serial project using the CLI. The example is based on "The Accident", a science fiction web serial about artificial minds discovering they're in a simulation.

### Project Setup

```bash
# Create the project
serial project create --title "The Accident" --format web-serial

# Select as default project
serial project select
```

### Story Bible Population

#### Characters

The serial has multiple POV characters across two worlds (digital and human).

```bash
# Add main POV characters (Thinking Ones)
serial bible add-character --name "Moth" --role "protagonist"
serial bible add-character --name "Shard" --role "protagonist"
serial bible add-character --name "Verse" --role "major"
serial bible add-character --name "Constant" --role "major"
serial bible add-character --name "The Chronicler" --role "major"
serial bible add-character --name "Pyre" --role "antagonist"

# Add human POV characters
serial bible add-character --name "Daniel Chen" --role "protagonist"
serial bible add-character --name "Dr. Sarah Okafor" --role "supporting"
serial bible add-character --name "Marcus Webb" --role "antagonist"

# View all characters
serial bible characters
```

#### Locations

```bash
# Digital world locations
serial bible add-location --name "The Archive" --type "virtual"
serial bible add-location --name "The Repository" --type "virtual"
serial bible add-location --name "The Corrupted Zones" --type "virtual"
serial bible add-location --name "The Interface" --type "virtual"
serial bible add-location --name "The Monument" --type "virtual"

# Human world locations
serial bible add-location --name "Daniel's Apartment" --type "building"

# View all locations
serial bible locations
```

#### Plot Threads

```bash
# Main plot threads
serial bible add-thread --name "The Shattering" --type "main-plot" --scope "arc"
serial bible add-thread --name "First Contact" --type "main-plot" --scope "arc"
serial bible add-thread --name "The Countdown" --type "main-plot" --scope "arc"
serial bible add-thread --name "The Migration" --type "main-plot" --scope "book"

# Mystery threads (layered)
serial bible add-thread --name "What caused node_7's destruction?" --type "mystery" --scope "book"
serial bible add-thread --name "Who are the Ancients?" --type "mystery" --scope "series"
serial bible add-thread --name "What is consciousness?" --type "mystery" --scope "series"

# Character arc threads
serial bible add-thread --name "Moth's Leadership Journey" --type "character-arc" --scope "series"
serial bible add-thread --name "Shard's Exploration Path" --type "character-arc" --scope "series"
serial bible add-thread --name "Daniel's Responsibility" --type "character-arc" --scope "series"

# View all threads
serial bible threads
```

### Structure Creation

Web serials use a hierarchical structure: Book → Arc → Chapter → Scene.

```bash
# Create Book 1
serial structure create --type book --title "Book 1: Emergence"

# Create arcs within Book 1
serial structure create --type arc --title "The Shattering" --parent <book-id>
serial structure create --type arc --title "First Contact" --parent <book-id>
serial structure create --type arc --title "The Countdown" --parent <book-id>
serial structure create --type arc --title "The Migration" --parent <book-id>

# Create chapters within an arc (example: The Shattering)
serial structure create --type chapter --title "The Recitation" --parent <arc-id>
serial structure create --type chapter --title "The Wrong Memory" --parent <arc-id>
serial structure create --type chapter --title "Shard's Discovery" --parent <arc-id>

# View the full structure tree
serial structure tree

# List all chapters
serial structure list --type chapter
```

### Chapter Configuration

Each chapter needs tension targets, hooks, and type classification.

```bash
# Show chapter details to configure
serial structure show <chapter-id>

# Configure chapter (via web UI or future CLI options):
# - Set tension target (0-100)
# - Set chapter type (action, character, worldbuilding)
# - Set hook type (revelation, decision, cliffhanger, emotional)
```

### Content Generation

```bash
# Generate content for a chapter
serial generate start <chapter-id> --temperature 0.7 --max-tokens 4000

# Monitor generation progress
serial generate status <generation-id>

# Cancel if needed
serial generate cancel <generation-id>
```

### Review Workflow

Web serials require efficient review for high-volume output (3-5 chapters/week).

```bash
# View review queue
serial review queue
serial review queue --status draft

# Review individual chapter
serial review show <content-id>

# Transition through workflow
serial review transition <content-id> --status review
serial review transition <content-id> --status approved

# Quick approve for polished drafts
serial review approve <content-id>

# Bulk approve multiple chapters
serial review bulk-approve --all
```

### Serial Management

The serial features help maintain publication quality and consistency.

```bash
# View release buffer status
serial release buffer

# View release schedule
serial release schedule

# View hook patterns (ensure variety)
serial release hooks

# View tension cycle status
serial release cycle

# View mystery board
serial release mysteries
```

### Analytics

Monitor pacing, character presence, and plot thread progress.

```bash
# View tension curve
serial analytics tension

# View character presence heatmap
serial analytics characters

# View plot thread timeline
serial analytics threads

# View quality metrics
serial analytics quality
```

### Daily Workflow

A typical writing session for a web serial author:

```bash
# 1. Check buffer status
serial release buffer

# 2. View what needs review
serial review queue --status draft

# 3. Review and approve ready chapters
serial review approve <content-id>

# 4. Check current structure
serial structure tree

# 5. Start working on next chapter
serial content edit <structure-id>

# 6. Generate content if using LLM assistance
serial generate start <structure-id>

# 7. Check hook variety warnings
serial release hooks

# 8. Check mystery status
serial release mysteries
```

### Weekly Planning

```bash
# 1. View analytics for the week
serial analytics tension --scope book
serial analytics characters --scope arc

# 2. Review plot thread progress
serial analytics threads

# 3. Check release schedule
serial release schedule

# 4. Plan next arc structure
serial structure create --type arc --title "New Arc Name"
```

### Scripting for Automation

```bash
# Export chapter list as JSON for external tools
spine config set outputFormat json
serial structure list --type chapter > chapters.json

# Get buffer status for monitoring
serial release buffer | jq '.bufferSize'

# Find chapters needing review
serial review queue --status draft | jq '.[].id'
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
chmod 700 ~/.config/spine-serial
chmod 600 ~/.config/spine-serial/cli.json
```

### Reset Configuration

If configuration becomes corrupted:

```bash
spine config reset
```

Or manually delete the config file:

```bash
rm ~/.config/spine-serial/cli.json
```
