# TechBook CLI

The TechBook CLI provides a command-line interface for managing technical book projects with literate programming support. It connects to a TechBook server via WebSocket and provides commands for all core operations.

> **Note**: This domain is planned but not yet implemented. See [Implementation Status](../tasks.md) for progress.

## Planned Commands

### Project Management

```bash
techbook project list              # List all projects
techbook project create            # Create a new project
techbook project load <id>         # Load a project
techbook project delete <id>       # Delete a project
```

### Concepts

Manage glossary entries (terms, types, algorithms, patterns):

```bash
techbook concept list              # List all concepts
techbook concept create            # Create a concept
techbook concept update <id>       # Update a concept
techbook concept delete <id>       # Delete a concept
techbook concept deps <id>         # Show concept dependencies
```

### Snippets

Manage code snippets with file and part metadata:

```bash
techbook snippet list              # List all snippets
techbook snippet create            # Create a snippet
techbook snippet update <id>       # Update a snippet
techbook snippet delete <id>       # Delete a snippet
techbook snippet show <id>         # Show snippet content
```

### Checkpoints

Manage validated states of tangled code:

```bash
techbook checkpoint list           # List all checkpoints
techbook checkpoint create         # Create a checkpoint
techbook checkpoint release <id>   # Mark checkpoint as released
techbook checkpoint snapshot <id>  # Create a snapshot at checkpoint
```

### Tangle

Generate source files from snippets:

```bash
techbook tangle                    # Tangle all files
techbook tangle <checkpoint>       # Tangle at specific checkpoint
techbook tangle --incremental      # Only tangle changed files
```

### Validation

Run the validation pipeline:

```bash
techbook validate                  # Run all validators
techbook validate <checkpoint>     # Validate specific checkpoint
techbook validate --compile        # Run compile validator only
techbook validate --test           # Run test validator only
```

### Weave

Render manuscript to output formats:

```bash
techbook weave html                # Render to HTML
techbook weave pdf                 # Render to PDF
techbook weave epub                # Render to EPUB
```

### Export

Export project data:

```bash
techbook export                    # Export full project
techbook export --format json      # Export as JSON
```

## Configuration

The CLI will store configuration in `~/.config/spine-techbook/cli.json`.

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | string | `ws://localhost:8081` | WebSocket server URL |
| `defaultProject` | string | - | Default project ID to use |
| `outputFormat` | string | `table` | Output format: `table`, `json`, or `plain` |
| `color` | boolean | `true` | Enable colored output |

## See Also

- [TechBook MCP Reference](./mcp.md)
- [Literate Programming Guide](./literate-programming.md) (planned)
