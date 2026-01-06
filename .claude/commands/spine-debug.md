# spine-debug

Debug an issue in the Spine codebase.

## Issue

$ARGUMENTS

## Debugging Checklist

### 1. Reproduce
- [ ] Can the issue be reproduced consistently?
- [ ] What are the exact steps to reproduce?
- [ ] What is the expected behavior?
- [ ] What is the actual behavior?

### 2. Isolate
- [ ] Which package is the issue in?
- [ ] Which layer (CLI → Server → Core)?
- [ ] Is it framework or domain code?
- [ ] What's the minimal reproduction case?

### 3. Investigate

#### Data Flow
- [ ] Trace the request from entry point
- [ ] Check data transformations at each step
- [ ] Verify types match at boundaries
- [ ] Look for data loss or corruption

#### Error Handling
- [ ] Is the error being caught and swallowed?
- [ ] Is the error message accurate?
- [ ] Are error codes correct?
- [ ] Is the error propagating correctly?

#### State
- [ ] Is session state correct?
- [ ] Is database state correct?
- [ ] Are there race conditions?
- [ ] Is state being mutated unexpectedly?

### 4. Fix
- [ ] What is the root cause?
- [ ] What is the minimal fix?
- [ ] Does the fix introduce new issues?
- [ ] Is the fix in the right layer?

### 5. Verify
- [ ] Does the fix resolve the issue?
- [ ] Do existing tests still pass?
- [ ] Is a new test needed to prevent regression?

## Context Files

@docs/goals.md
@docs/tasks.md
@docs/framework/architecture.md

## Debugging Commands

```bash
# Run tests for specific package
cd packages/{package} && pnpm test

# Run tests with verbose output
cd packages/{package} && pnpm test -- --reporter=verbose

# Run specific test file
cd packages/{package} && pnpm test -- src/path/to/file.test.ts

# Type check
pnpm check-types

# Lint
pnpm lint

# Check server logs
# (depends on how server is run)

# Test CLI command
cd apps/serial-cli && pnpm dev -- [command]

# Test MCP tool
# Use Claude Desktop or MCP inspector
```

## Common Issues

### "No project loaded"
- Session state not set
- Check `spine_project_load` was called
- Check session is persisted across calls

### "Entity not found"
- Wrong ID format (uuid vs other)
- Entity in wrong project
- Entity deleted

### "Method not found"
- Handler not registered
- Wrong method name format
- Domain server not running

### Type Errors at Runtime
- Zod schema mismatch
- Missing `.parse()` call
- Schema not exported

### WebSocket Connection Issues
- Server not running
- Wrong port
- URL format (ws:// vs http://)

## Output Format

```
## Issue Summary
[One paragraph description]

## Reproduction Steps
1. [Step]
2. [Step]
3. [Expected vs Actual]

## Investigation

### Hypothesis 1: [Description]
- Evidence for: [What supports this]
- Evidence against: [What contradicts this]
- Verdict: [Confirmed/Ruled Out/Needs More Info]

### Hypothesis 2: [Description]
...

## Root Cause
[Detailed explanation of what's wrong and why]

## Fix

### Location
[File(s) that need to change]

### Changes
```typescript
// Before
[code]

// After
[code]
```

### Explanation
[Why this fixes the issue]

## Verification

### Manual Testing
- [ ] [Test step]

### Automated Testing
- [ ] Existing tests pass
- [ ] New test added: [description]

## Prevention
[How to prevent similar issues in the future]

## Tasks for tasks.md
- [ ] [Any follow-up tasks]
```