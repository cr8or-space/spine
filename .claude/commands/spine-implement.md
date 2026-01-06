# spine-implement

Implementation task for Spine Framework or domain packages.

## Task

$ARGUMENTS

## Context Files

### Framework Goals & Architecture
- @docs/goals.md
- @docs/plan.md
- @docs/tasks.md

### Domain Documentation (if working on a specific domain)
- @docs/serial/cli.md (for serial domain)
- @docs/serial/mcp.md (for serial domain)
- @docs/techbook/cli.md (for techbook domain)
- @docs/techbook/mcp.md (for techbook domain)

### Architecture Reference
- @docs/framework/architecture.md
- @docs/framework/extension-points.md

## Guidelines

### General
- Follow all instructions in docs/goals.md
- If something is NOT specified, use goals.md as the source of truth for decisions
- Migration and legacy support is not needed
- Make sure unit tests pass before completing
- Unit tests are REQUIRED for new functionality

### Framework vs Domain
- Code mentioning domain-specific types (Character, Snippet, etc.) belongs in domain packages
- Framework code must be generic - no imports from domain packages
- All operations go through the WebSocket server - CLI and MCP are clients
- Use the appropriate skill file before implementing:
  - Framework work → read spine-framework skill
  - Serial domain → read spine-serial skill
  - TechBook domain → read spine-techbook skill
  - Server handlers → read spine-server-handlers skill
  - MCP tools → read spine-mcp-tools skill

### Code Style
- TypeScript strict mode
- Zod for runtime validation
- kebab-case files, camelCase functions, PascalCase types
- Co-locate tests: `foo.ts` → `foo.test.ts`
- Imports: external → internal → relative, alphabetized

### Testing
- Add unit tests for new functionality
- Run `pnpm test` in affected packages
- Run `pnpm lint` before completing

### Documentation Updates

**Always update docs/tasks.md:**
- Check off completed tasks
  * It is NOT considered complete until it is tested
- Add tasks for anything skipped or not completed
- Add tasks for any identified changes you did not implement
- Keep entries concise - this is a summary/checklist

**Update user documentation for user-facing changes:**
- docs/serial/cli.md for serial CLI changes
- docs/serial/mcp.md for serial MCP changes
- docs/techbook/cli.md for techbook CLI changes
- docs/techbook/mcp.md for techbook MCP changes

**Update architecture documentation for internal changes:**
- docs/framework/architecture.md for framework changes
- docs/framework/extension-points.md for new extension points

### Commit Hygiene
- Keep changes focused on the task
- Don't mix unrelated changes
- Docs are being updated by multiple users - keep changes local to the area being modified