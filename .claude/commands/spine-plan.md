# spine-plan

Plan a new feature or significant change before implementation.

## Task

$ARGUMENTS

## Planning Checklist

### 1. Understand the Goal
- [ ] What problem does this solve?
- [ ] Who benefits (author workflow, system reliability, etc.)?
- [ ] How does this align with docs/goals.md?

### 2. Scope Definition
- [ ] What's in scope?
- [ ] What's explicitly out of scope?
- [ ] What are the acceptance criteria?

### 3. Architecture Impact

#### Framework vs Domain
- [ ] Does this change framework infrastructure?
- [ ] Does this change domain-specific logic?
- [ ] Are new extension points needed?
- [ ] Does this affect the framework/domain boundary?

#### Package Impact
- [ ] Which packages are affected?
- [ ] Are new packages needed?
- [ ] What are the dependency implications?

### 4. API Design
- [ ] What server handlers are needed?
- [ ] What CLI commands are needed?
- [ ] What MCP tools are needed?
- [ ] What are the request/response shapes?

### 5. Data Model
- [ ] What new types/schemas are needed?
- [ ] What storage changes are needed?
- [ ] How does this affect existing data?

### 6. Validation
- [ ] What constraints must be enforced?
- [ ] What validators are needed?
- [ ] Which validation phase (structural/automated/computed)?

### 7. Testing Strategy
- [ ] What unit tests are needed?
- [ ] What integration tests are needed?
- [ ] What edge cases must be covered?

### 8. Implementation Order
- [ ] What must be done first?
- [ ] What can be parallelized?
- [ ] What are the milestones?

## Context Files

@docs/goals.md
@docs/plan.md
@docs/tasks.md
@docs/framework/architecture.md
@docs/framework/extension-points.md

## Guidelines

- Follow framework principles from goals.md
- Consider both domains (serial and techbook) for framework changes
- Prefer composition over inheritance
- Keep extension points explicit
- Plan for testability

## Output Format

```
## Feature: [Name]

### Problem Statement
[What problem this solves and why it matters]

### Goal Alignment
[How this aligns with goals.md principles]

### Scope

**In Scope:**
- [Item]

**Out of Scope:**
- [Item]

**Acceptance Criteria:**
- [ ] [Criterion]

### Architecture

**Package Changes:**
| Package | Change Type | Description |
|---------|-------------|-------------|
| @repo/framework/core | Modify | [What changes] |

**New Extension Points:**
- [Extension point and purpose]

**Data Model:**
```typescript
// New/modified schemas
```

### API Design

**Server Handlers:**
| Method | Description |
|--------|-------------|
| domain.resource.action | [What it does] |

**CLI Commands:**
```bash
# Command examples
```

**MCP Tools:**
| Tool | Description |
|------|-------------|
| spine_resource_action | [What it does] |

### Validation

| Validator | Phase | Checks |
|-----------|-------|--------|
| [Name] | [Phase] | [What it validates] |

### Testing Strategy

**Unit Tests:**
- [What to test]

**Integration Tests:**
- [What to test]

### Implementation Plan

**Phase 1: [Name]**
- [ ] Task 1
- [ ] Task 2

**Phase 2: [Name]**
- [ ] Task 1

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk] | [H/M/L] | [H/M/L] | [How to mitigate] |

### Open Questions
- [ ] [Question needing resolution]

### Tasks to Add to tasks.md
- [ ] [Task]
```