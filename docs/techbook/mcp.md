# TechBook MCP Server

The TechBook MCP (Model Context Protocol) server exposes technical book authoring functionality as tools for LLM interaction. This enables AI assistants like Claude to work directly with your techbook projects - managing concepts, snippets, checkpoints, and the tangle/weave pipeline.

> **Note**: This domain is planned but not yet implemented. See [Implementation Status](../tasks.md) for progress.

## Planned Tools

### Project Tools

| Tool | Description |
|------|-------------|
| `techbook_project_list` | List all projects |
| `techbook_project_create` | Create a new project |
| `techbook_project_load` | Load a project into session |
| `techbook_project_delete` | Delete a project |

### Concept Tools

| Tool | Description |
|------|-------------|
| `techbook_concept_list` | List all concepts |
| `techbook_concept_create` | Create a new concept |
| `techbook_concept_update` | Update a concept |
| `techbook_concept_delete` | Delete a concept |
| `techbook_concept_deps` | Get concept dependencies |

### Snippet Tools

| Tool | Description |
|------|-------------|
| `techbook_snippet_list` | List all snippets |
| `techbook_snippet_create` | Create a new snippet |
| `techbook_snippet_update` | Update a snippet |
| `techbook_snippet_delete` | Delete a snippet |
| `techbook_snippet_show` | Show snippet content |

### Checkpoint Tools

| Tool | Description |
|------|-------------|
| `techbook_checkpoint_list` | List all checkpoints |
| `techbook_checkpoint_create` | Create a checkpoint |
| `techbook_checkpoint_release` | Mark checkpoint as released |
| `techbook_checkpoint_snapshot` | Create a snapshot |

### Tangle Tools

| Tool | Description |
|------|-------------|
| `techbook_tangle` | Tangle all files |
| `techbook_tangle_checkpoint` | Tangle at specific checkpoint |
| `techbook_tangle_file` | Tangle a specific file |

### Validation Tools

| Tool | Description |
|------|-------------|
| `techbook_validate` | Run all validators |
| `techbook_validate_compile` | Run compile validator |
| `techbook_validate_test` | Run test validator |
| `techbook_validate_output` | Run output fixture validator |

### Weave Tools

| Tool | Description |
|------|-------------|
| `techbook_weave_html` | Render to HTML |
| `techbook_weave_pdf` | Render to PDF |
| `techbook_weave_epub` | Render to EPUB |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TECHBOOK_SERVER_URL` | `ws://localhost:8081` | TechBook WebSocket server URL |
| `TECHBOOK_AUTO_RECONNECT` | `true` | Auto-reconnect on disconnect |
| `TECHBOOK_RECONNECT_DELAY` | `1000` | Reconnect delay in ms |
| `TECHBOOK_REQUEST_TIMEOUT` | `30000` | Request timeout in ms |

### Config File

Create `~/.config/spine-techbook/mcp.json`:

```json
{
  "serverUrl": "ws://localhost:8081",
  "autoReconnect": true,
  "reconnectDelay": 1000,
  "requestTimeout": 30000
}
```

## Setting Up with Claude Desktop

Add the TechBook MCP server to your Claude Desktop configuration:

### macOS
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "techbook": {
      "command": "node",
      "args": ["/path/to/spine/packages/techbook/mcp/dist/index.js"],
      "env": {
        "TECHBOOK_SERVER_URL": "ws://localhost:8081"
      }
    }
  }
}
```

### Windows
Edit `%APPDATA%\Claude\claude_desktop_config.json` with the same structure.

## See Also

- [TechBook CLI Reference](./cli.md)
- [Literate Programming Guide](./literate-programming.md) (planned)
