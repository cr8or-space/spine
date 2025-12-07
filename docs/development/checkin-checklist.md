# Check-in Checklist

Complete this checklist before committing code to the repository.

## Pre-Commit Checks

### Code Quality

- [ ] Code compiles without errors (`npm run build`)
- [ ] No TypeScript errors or warnings in strict mode
- [ ] Linting passes (`npm run lint`)
- [ ] Code formatted with Prettier (`npm run format`)

### Testing

- [ ] All existing tests pass (`npm run test`)
- [ ] New tests written for new functionality
- [ ] Edge cases covered in tests
- [ ] No skipped or commented-out tests without explanation

### Functionality

- [ ] Feature works as intended
- [ ] Error cases handled gracefully
- [ ] No regressions in existing functionality
- [ ] CLI commands produce expected output

### Code Review Preparation

- [ ] Self-reviewed the diff
- [ ] Removed debug statements and console.logs
- [ ] No hardcoded values that should be configurable
- [ ] No sensitive data (API keys, credentials)

## Documentation

- [ ] Public functions have JSDoc comments
- [ ] Complex logic has inline comments explaining *why*
- [ ] README updated if adding new features or commands
- [ ] Architecture docs updated if design changed

## Commit Standards

### Message Format

- [ ] Subject line uses imperative mood ("add" not "added")
- [ ] Subject line under 50 characters
- [ ] Type prefix included (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- [ ] Body explains *what* and *why* (not *how*)

### Commit Content

- [ ] Commit is atomic (single logical change)
- [ ] No unrelated changes bundled together
- [ ] Large changes split into reviewable commits

## Before Push

- [ ] Pulled latest changes from main
- [ ] Resolved any merge conflicts
- [ ] Re-ran tests after merge
- [ ] Branch name follows convention (`feat/`, `fix/`, `docs/`)

## Type-Specific Checks

### For Feature Changes (`feat:`)

- [ ] User-facing behavior documented
- [ ] CLI help text updated if applicable
- [ ] Breaking changes noted

### For Bug Fixes (`fix:`)

- [ ] Root cause identified and fixed
- [ ] Test added to prevent regression
- [ ] Related issues referenced in commit

### For Refactoring (`refactor:`)

- [ ] No behavioral changes
- [ ] Tests still pass without modification
- [ ] Performance not negatively impacted

### For Dependency Updates (`chore:`)

- [ ] All tests pass with new dependencies
- [ ] No security vulnerabilities introduced
- [ ] Breaking changes in dependencies addressed
