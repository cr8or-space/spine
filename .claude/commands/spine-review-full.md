# spine-review-full

Comprehensive review of uncommitted changes. Use this for larger changes, PRs, or before major milestones.

Ensure ALL tasks are tracked, even optional and low priority ones.  There is no such thing as a "small" workaround or hack.

Missing tests are CRITICAL.  New code must have tests, and edge cases and error paths must be covered.

## Task Checklist

### 1. Workarounds & Technical Debt
- [ ] Identify any workarounds, hacks, or temporary solutions
- [ ] For each workaround found:
  - Document why it exists
  - Add task to tasks.md with full fix description
  - Assess risk of leaving it in place
- [ ] Check for TODO/FIXME/HACK comments that need tracking

### 2. Correctness
- [ ] Logic correctness - does the code do what it's supposed to?
- [ ] Edge cases handled appropriately
- [ ] Error handling is comprehensive and consistent
- [ ] Async operations handled correctly (no race conditions, proper awaits)
- [ ] Resource cleanup (connections, file handles, etc.)

### 3. Framework/Domain Architecture
- [ ] **Framework boundary respected**
  - Framework packages have no domain imports
  - Generic interfaces used in framework
  - Domain-specific logic in domain packages only
- [ ] **Extension points used correctly**
  - Handlers registered properly
  - Validators follow the interface
  - Entity types registered with schemas
- [ ] **Server architecture**
  - All operations go through WebSocket server
  - CLI/MCP are clients, not direct core callers
  - Session context used appropriately

### 4. Code Style & Conventions
- [ ] TypeScript strict mode - no `any` types, proper null handling
- [ ] Zod schemas for all external data
- [ ] Naming conventions followed:
  - kebab-case files
  - camelCase functions/variables
  - PascalCase types/classes
  - UPPER_SNAKE_CASE constants
- [ ] Import order: external → internal → relative, alphabetized
- [ ] Co-located tests (`foo.ts` → `foo.test.ts`)

### 5. Goal Alignment
- [ ] Changes align with docs/goals.md principles
- [ ] Author authority preserved (system suggests, author decides)
- [ ] Validation is explicit, not hidden
- [ ] Storage abstraction maintained
- [ ] Server-as-interface pattern followed

### 6. Restrictions & Limitations
- [ ] Identify any new restrictions introduced
- [ ] Verify restrictions are tracked in tasks.md
- [ ] If fixing a previous restriction:
  - Confirm it's actually fixed end-to-end
  - Not just moved to a different location
  - Tests cover the previously-restricted case

### 7. Test Coverage
- [ ] New functions have unit tests
- [ ] Edge cases have tests
- [ ] Error paths have tests
- [ ] Integration points tested
- [ ] No tests deleted without justification

### 8. Documentation
- [ ] **tasks.md updated**
  - Completed tasks checked off
  - New tasks added for incomplete work
  - Workarounds documented as tasks
- [ ] **User documentation current**
  - CLI changes → docs/serial/cli.md or docs/techbook/cli.md
  - MCP changes → docs/serial/mcp.md or docs/techbook/mcp.md
  - API changes → appropriate API docs
- [ ] **Architecture documentation current**
  - Framework changes → docs/framework/architecture.md
  - New extension points → docs/framework/extension-points.md
- [ ] **Code comments**
  - Complex logic explained
  - Public APIs documented
  - Non-obvious decisions noted

### 9. Security & Safety
- [ ] No sensitive data logged
- [ ] Input validation in place
- [ ] Path traversal prevented for file operations
- [ ] Destructive operations require confirmation

### 10. Performance Considerations
- [ ] No obvious N+1 query patterns
- [ ] Large datasets handled with pagination/streaming
- [ ] Expensive operations can be cancelled
- [ ] Caching used where appropriate

## Context Files

@docs/goals.md
@docs/plan.md  
@docs/tasks.md
@docs/framework/architecture.md
@docs/framework/extension-points.md
@docs/serial/cli.md
@docs/serial/mcp.md
@docs/techbook/cli.md
@docs/techbook/mcp.md

## Guidelines

- **No need to run tests** - this is a comprehensive diff review
- Follow all instructions in docs/goals.md
- Migration and legacy support is not needed
- Docs are being updated by multiple users - keep changes local

## Review Output Format

```
## Executive Summary
[2-3 sentence overview of changes and overall assessment]

## Change Analysis

### What Changed
- [List of logical changes, not file-by-file]

### Risk Assessment
- **High Risk**: [Areas that could cause issues]
- **Medium Risk**: [Areas to watch]
- **Low Risk**: [Safe changes]

## Detailed Findings

### Critical Issues (Block Commit)
1. **[Issue Title]**
   - Location: [file:line]
   - Problem: [Description]
   - Impact: [What breaks]
   - Fix: [How to resolve]

### Major Issues (Should Fix)
1. **[Issue Title]**
   - Location: [file:line]
   - Problem: [Description]
   - Recommendation: [Suggested fix]

### Minor Issues (Nice to Fix)
1. **[Issue Title]**
   - Location: [file:line]
   - Suggestion: [Improvement]

### Style/Convention Issues
- [List of style issues]

## Architecture Compliance

### Framework/Domain Boundary
[Assessment of boundary respect]

### Goal Alignment
[Assessment of alignment with goals.md]

## Test Coverage Assessment
[Analysis of test coverage for changes]

## Documentation Status

### Updates Required
- [ ] [Doc path]: [What to update]

### Updates Completed (Verify)
- [ ] [Doc path]: [What was updated]

## Tasks for tasks.md

### Completed (to check off)
- [ ] [Task description]

### New Tasks (to add)
- [ ] [Task description with context]

### Workaround Tasks
- [ ] [Workaround]: [What needs to be done for full fix]

## Final Assessment

**Recommendation**: [APPROVE / APPROVE WITH CHANGES / REQUEST CHANGES]

**Confidence**: [HIGH / MEDIUM / LOW]

**Notes for Committer**:
[Any specific instructions or warnings]
```