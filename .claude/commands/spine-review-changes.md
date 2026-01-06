# spine-review-changes

Quick review of uncommitted changes before commit/submit.

## Task Checklist

- [ ] Review uncommitted changes for **workarounds or hacks**
  - Add tasks to tasks.md for any workarounds found
  - Include what needs to be done for a fully correct solution
  
- [ ] Review uncommitted changes for **correctness and style**
  - Adherence to goals.md principles
  - TypeScript strict mode compliance
  - Zod schemas for validation
  - Proper error handling
  
- [ ] Review uncommitted changes for **framework/domain boundary**
  - Framework code doesn't import from domains
  - Domain-specific logic stays in domain packages
  - Server handlers properly registered
  
- [ ] Review uncommitted changes for **restrictions or limitations**
  - Any new restrictions not tracked in tasks.md?
  - If fixing a previous restriction, verify it's actually fixed
  - Not just moving the problem elsewhere
  
- [ ] Review uncommitted changes for **missing tests**
  - New functions should have tests
  - Edge cases covered
  - Error paths tested
  
- [ ] Review uncommitted changes against **documentation**
  - User-facing changes reflected in CLI/MCP docs
  - Architecture changes reflected in framework docs
  - tasks.md updated with completed/new items

- [ ] Ensure **documentation is updated**
  - tasks.md checked off for completed work
  - New tasks added for incomplete items
  - User docs updated for user-facing changes

## Context Files

@docs/goals.md
@docs/plan.md
@docs/tasks.md
@docs/framework/architecture.md
@docs/serial/cli.md
@docs/serial/mcp.md
@docs/techbook/cli.md
@docs/techbook/mcp.md

## Guidelines

- **No need to run tests or rebuild** - this is a diff review only
- Follow all instructions in docs/goals.md
- Migration and legacy support is not needed
- Docs are being updated by multiple users - keep changes local to the area being tracked

## Review Output Format

Provide feedback in this structure:

```
## Summary
[One paragraph overview of the changes]

## Issues Found

### Critical (must fix before commit)
- [Issue description and suggested fix]

### Recommended (should fix)
- [Issue description and suggested fix]

### Minor (optional improvements)
- [Issue description and suggested fix]

## Documentation Updates Needed
- [ ] [Specific doc and what to update]

## Tasks to Add
- [ ] [Task description for tasks.md]

## Approval
[APPROVED / APPROVED WITH CHANGES / NEEDS WORK]
```