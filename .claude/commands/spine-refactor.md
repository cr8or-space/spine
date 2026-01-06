# spine-refactor

Refactor code while preserving behavior.

## Task

$ARGUMENTS

## Refactoring Checklist

### 1. Pre-Refactor Analysis
- [ ] What behavior must be preserved?
- [ ] What tests currently cover this code?
- [ ] What depends on this code (importers)?
- [ ] What does this code depend on (imports)?

### 2. Safety Checks
- [ ] All existing tests pass before starting
- [ ] Types compile cleanly
- [ ] No lint errors

### 3. Refactoring Strategy
- [ ] What is the target state?
- [ ] Can this be done incrementally?
- [ ] What are the intermediate milestones?
- [ ] What's the rollback plan?

### 4. Framework/Domain Considerations
- [ ] Does this move code between framework and domain?
- [ ] Are extension points being introduced?
- [ ] Is the framework/domain boundary clearer after?

### 5. Execute Refactor
- [ ] Make changes in small, testable increments
- [ ] Run tests after each increment
- [ ] Verify types compile after each increment

### 6. Post-Refactor Verification
- [ ] All existing tests pass
- [ ] No new type errors
- [ ] No new lint errors
- [ ] Behavior unchanged (manual verification if needed)
- [ ] Dependencies updated if moved

### 7. Cleanup
- [ ] Remove dead code
- [ ] Update imports
- [ ] Update documentation
- [ ] Update tasks.md

## Context Files

@docs/goals.md
@docs/plan.md
@docs/tasks.md
@docs/framework/architecture.md
@docs/framework/extension-points.md

## Guidelines

### Safe Refactoring Practices

**Do:**
- Make one logical change at a time
- Run tests after each change
- Commit working intermediate states
- Use IDE refactoring tools when available
- Keep the diff reviewable

**Don't:**
- Change behavior while refactoring
- Refactor and add features simultaneously
- Make changes you can't easily undo
- Skip the test run "just this once"

### Framework Extraction Patterns

When extracting from domain to framework:

```typescript
// 1. Identify generic interface
interface Validator<T> {
  validate(item: T): ValidationResult;
}

// 2. Move interface to framework
// packages/framework/types/validation.ts

// 3. Domain implements interface
// packages/serial/core/validators/continuity.ts
const continuityValidator: Validator<Chapter> = { ... }

// 4. Update imports throughout
```

When moving domain code:

```typescript
// 1. Copy to new location
// 2. Update imports to use new location
// 3. Verify tests pass
// 4. Delete old location
// 5. Final test run
```

### Import Update Strategy

```bash
# Find all files importing the old path
grep -r "from '@repo/old/path'" packages/ apps/

# Update each file
# Verify types compile
# Run tests
```

## Output Format

```
## Refactoring Summary
[What's being refactored and why]

## Current State Analysis

### Code Being Refactored
- Location: [file path]
- Lines: [count]
- Dependents: [who imports this]
- Dependencies: [what this imports]

### Test Coverage
- [List of tests covering this code]

## Target State

### After Refactoring
- New location: [file path]
- Interface changes: [if any]
- Dependency changes: [if any]

### Benefits
- [Why this is better]

## Refactoring Plan

### Step 1: [Description]
- [ ] Action
- [ ] Verify: tests pass

### Step 2: [Description]
- [ ] Action
- [ ] Verify: tests pass

### Step N: Cleanup
- [ ] Remove old code
- [ ] Update imports
- [ ] Final test run

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| [What could go wrong] | [How to prevent/recover] |

## Verification

### Before Refactoring
- [ ] `pnpm test` passes
- [ ] `pnpm check-types` passes
- [ ] `pnpm lint` passes

### After Refactoring
- [ ] `pnpm test` passes
- [ ] `pnpm check-types` passes
- [ ] `pnpm lint` passes
- [ ] Behavior unchanged

## Documentation Updates
- [ ] [What docs need updating]

## Tasks for tasks.md
- [ ] [Follow-up tasks]
```