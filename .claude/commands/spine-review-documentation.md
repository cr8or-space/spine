Task:
  [ ] - Review all code for comparison against documentation
  [ ] - Ensure that all documentation is updated to reflect the actual code base

  - No need to run tests, or re-build code, just a review of the diffs

Docs:
    @docs/goals.md
    @docs/user/api.md
    @docs/user/cli.md
    @docs/user/mcp.md
    @docs/implementation/tasks.md
    @docs/implementation/plan.md
    @docs/architecture/packages.md
    @docs/architecture/testing.md

General Guidelines:
  - Follow all instructions in docs/goals.md
    * If something is NOT specified, use the docs/goals.md as the source of truth for decisions
  - Migration and legacy support is not needed.
  - Make sure unit tests pass.
  - Docs are being updated by multiple users.  Keep changes local to the area it is being tracked in.

Documentation Guidelines:
  -Update the docs/implementation/tasks.md with any new tasks created:
    - Add tasks for anything skipped or not completed
    - Add tasks for any identified changes that you did not implement
    - This is for summary only, update, but don't add signficant amounts of text
  - Update docs/user/*.md as needed for user-facing changes
  - Update docs/architecture/*.md as needed for architecture/developer-facing changes