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

# List factions
spine bible factions

# List world rules
spine bible rules

# List plot threads
spine bible threads

# List timeline events
spine bible timeline

# Add a new character (interactive or with options)
spine bible add-character
spine bible add-character --name "Hero" --role protagonist

# Add a new location
spine bible add-location
spine bible add-location --name "Castle" --type building

# Add a new faction
spine bible add-faction
spine bible add-faction --name "The Guild" --type organization

# Add a new world rule
spine bible add-rule
spine bible add-rule --name "Magic Costs Energy" --category magic

# Add a new plot thread
spine bible add-thread
spine bible add-thread --name "Main Quest" --type main

# Add a timeline event
spine bible add-event
spine bible add-event --name "The Great War" --date "Year 100" --significance major
```

### Structure

View and manage the story structure (books, arcs, chapters, scenes).

```bash
# Show structure tree
spine structure tree
spine structure tree --depth 2          # Limit display depth
spine structure tree --depth 0          # Show root only

# List structure elements
spine structure list
spine structure list --type chapter      # Filter by type
spine structure list --parent <id>       # Filter by parent

# Create a new structure element
spine structure create
spine structure create --type arc --title "The Beginning"

# Show element details
spine structure show <id>

# Update structure properties
spine structure update <id> --title "New Title"
spine structure update <id> --synopsis "Chapter summary"
spine structure update <id> --tension 75
spine structure update <id> --chapter-type action
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

### Analytics

View project analytics and insights for pacing, characters, and plot threads.

```bash
# View tension curve data
spine analytics tension
spine analytics tension --book <id>      # Filter by book
spine analytics tension --arc <id>       # Filter by arc

# View character presence data
spine analytics characters
spine analytics chars                    # Alias

# View plot thread timeline
spine analytics threads

# View quality metrics
spine analytics quality
```

### Serial

Manage web serial publishing features including buffer, schedule, hooks, and mysteries.

```bash
# View buffer status and health
spine serial buffer

# View release schedule and deadlines
spine serial schedule

# View hook patterns and variety warnings
spine serial hooks
spine serial hooks --book <id>

# View tension cycle status
spine serial cycle

# View mystery board with clue tracking
spine serial mysteries
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

## Example: "The Accident" Web Serial

This complete example demonstrates setting up and managing a web serial project using the CLI. The example is based on "The Accident", a science fiction web serial about artificial minds discovering they're in a simulation.

### Project Setup

```bash
# Create the project
spine project create --title "The Accident" --format web-serial

# Select as default project
spine project select
```

### Story Bible Population

#### Characters

The serial has multiple POV characters across two worlds (digital and human).

```bash
# Add main POV characters (Thinking Ones)
spine bible add-character --name "Moth" --role "protagonist"
spine bible add-character --name "Shard" --role "protagonist"
spine bible add-character --name "Verse" --role "major"
spine bible add-character --name "Constant" --role "major"
spine bible add-character --name "The Chronicler" --role "major"
spine bible add-character --name "Pyre" --role "antagonist"

# Add human POV characters
spine bible add-character --name "Daniel Chen" --role "protagonist"
spine bible add-character --name "Dr. Sarah Okafor" --role "supporting"
spine bible add-character --name "Marcus Webb" --role "antagonist"

# View all characters
spine bible characters
```

#### Locations

```bash
# Digital world locations
spine bible add-location --name "The Archive" --type "virtual"
spine bible add-location --name "The Repository" --type "virtual"
spine bible add-location --name "The Corrupted Zones" --type "virtual"
spine bible add-location --name "The Interface" --type "virtual"
spine bible add-location --name "The Monument" --type "virtual"

# Human world locations
spine bible add-location --name "Daniel's Apartment" --type "building"

# View all locations
spine bible locations
```

#### Plot Threads

```bash
# Main plot threads
spine bible add-thread --name "The Shattering" --type "main-plot" --scope "arc"
spine bible add-thread --name "First Contact" --type "main-plot" --scope "arc"
spine bible add-thread --name "The Countdown" --type "main-plot" --scope "arc"
spine bible add-thread --name "The Migration" --type "main-plot" --scope "book"

# Mystery threads (layered)
spine bible add-thread --name "What caused node_7's destruction?" --type "mystery" --scope "book"
spine bible add-thread --name "Who are the Ancients?" --type "mystery" --scope "series"
spine bible add-thread --name "What is consciousness?" --type "mystery" --scope "series"

# Character arc threads
spine bible add-thread --name "Moth's Leadership Journey" --type "character-arc" --scope "series"
spine bible add-thread --name "Shard's Exploration Path" --type "character-arc" --scope "series"
spine bible add-thread --name "Daniel's Responsibility" --type "character-arc" --scope "series"

# View all threads
spine bible threads
```

### Structure Creation

Web serials use a hierarchical structure: Book → Arc → Chapter → Scene.

```bash
# Create Book 1
spine structure create --type book --title "Book 1: Emergence"

# Create arcs within Book 1
spine structure create --type arc --title "The Shattering" --parent <book-id>
spine structure create --type arc --title "First Contact" --parent <book-id>
spine structure create --type arc --title "The Countdown" --parent <book-id>
spine structure create --type arc --title "The Migration" --parent <book-id>

# Create chapters within an arc (example: The Shattering)
spine structure create --type chapter --title "The Recitation" --parent <arc-id>
spine structure create --type chapter --title "The Wrong Memory" --parent <arc-id>
spine structure create --type chapter --title "Shard's Discovery" --parent <arc-id>

# View the full structure tree
spine structure tree

# List all chapters
spine structure list --type chapter
```

### Chapter Configuration

Each chapter needs tension targets, hooks, and type classification.

```bash
# Show chapter details to configure
spine structure show <chapter-id>

# Configure chapter (via web UI or future CLI options):
# - Set tension target (0-100)
# - Set chapter type (action, character, worldbuilding)
# - Set hook type (revelation, decision, cliffhanger, emotional)
```

### Content Generation

```bash
# Generate content for a chapter
spine generate start <chapter-id> --temperature 0.7 --max-tokens 4000

# Monitor generation progress
spine generate status <generation-id>

# Cancel if needed
spine generate cancel <generation-id>
```

### Review Workflow

Web serials require efficient review for high-volume output (3-5 chapters/week).

```bash
# View review queue
spine review queue
spine review queue --status draft

# Review individual chapter
spine review show <content-id>

# Transition through workflow
spine review transition <content-id> --status review
spine review transition <content-id> --status approved

# Quick approve for polished drafts
spine review approve <content-id>

# Bulk approve multiple chapters
spine review bulk-approve --all
```

### Serial Management

The serial features help maintain publication quality and consistency.

```bash
# View release buffer status
spine serial buffer

# View release schedule
spine serial schedule

# View hook patterns (ensure variety)
spine serial hooks

# View tension cycle status
spine serial cycle

# View mystery board
spine serial mysteries
```

### Analytics

Monitor pacing, character presence, and plot thread progress.

```bash
# View tension curve
spine analytics tension

# View character presence heatmap
spine analytics characters

# View plot thread timeline
spine analytics threads

# View quality metrics
spine analytics quality
```

### Daily Workflow

A typical writing session for a web serial author:

```bash
# 1. Check buffer status
spine serial buffer

# 2. View what needs review
spine review queue --status draft

# 3. Review and approve ready chapters
spine review approve <content-id>

# 4. Check current structure
spine structure tree

# 5. Start working on next chapter
spine content edit <structure-id>

# 6. Generate content if using LLM assistance
spine generate start <structure-id>

# 7. Check hook variety warnings
spine serial hooks

# 8. Check mystery status
spine serial mysteries
```

### Weekly Planning

```bash
# 1. View analytics for the week
spine analytics tension --scope book
spine analytics characters --scope arc

# 2. Review plot thread progress
spine analytics threads

# 3. Check release schedule
spine serial schedule

# 4. Plan next arc structure
spine structure create --type arc --title "New Arc Name"
```

### Scripting for Automation

```bash
# Export chapter list as JSON for external tools
spine config set outputFormat json
spine structure list --type chapter > chapters.json

# Get buffer status for monitoring
spine serial buffer | jq '.bufferSize'

# Find chapters needing review
spine review queue --status draft | jq '.[].id'
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
