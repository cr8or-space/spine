# Web App Refactor Plan

## Purpose
Redesign the Spine web app to make primary workflows (continue writing, review queue, analytics/serial oversight) fast, discoverable, and visually coherent. Emphasize clear hierarchy, reduced modal friction, and responsive layouts that preserve context.

## Outcomes
- Cohesive shell with predictable navigation and top-level wayfinding.
- Workspace that prioritizes writing, review, and context side-by-side.
- Dashboard that orients users to next actions (continue writing, review, buffer/health).
- Analytics and serial views that surface health at a glance with actionable insights.
- Drawer-first interaction pattern replacing most modals; better keyboard and command palette coverage.
- Accessible, themeable UI with centralized tokens for color/spacing/typography.

## Scope
- Global AppShell (nav rail + top bar), design tokens, and layout primitives.
- Pages: Dashboard, Workspace, Review Queue, Analytics, Serial, Bible/Entities, Settings.
- Interaction patterns: drawers, pill filters, keyboard shortcuts, command palette.
- Responsive behavior (desktop, tablet, mobile) and accessibility passes.
- Test updates (component + Playwright) aligned to new structure.

## Non-goals
- Backend/domain changes beyond UI needs.
- New generation/review features; focus is UX and IA.
- Theming beyond one primary palette (light/dark variants optional but not required now).

## Approach & Phases
1) Foundations
- Define design tokens (colors, spacing scale, typography, radii, shadows, motion).
- Implement primitives: AppShell, TopBar, NavRail, PageSection, StatCard, Drawer, PillFilters, EmptyState, DataList.
- Wire command palette + keyboard map.

2) Dashboard
- Build redesigned dashboard (continue writing CTA, queue summary, buffer/health, activity feed, quick filters).

3) Workspace
- Three-column layout (structure rail, editor, context drawer). Tabs: Draft, Outline, Beats, Analysis.
- Paragraph-level controls pinned; inline warnings; node metadata bar.
- Context drawer tabs: Notes, Bible refs, Warnings, History.

4) Review
- Queue list + split diff view; filters as pills; gutter actions pinned; comment drawer.

5) Analytics
- Scope selector; cards row; dual tension curve; presence heatmap; plot thread Gantt; hook variety; insights feed.

6) Serial
- Release calendar strip, buffer meter, hook variety meter, cycle indicator, mystery board.

7) Bible/Entities
- Two-panel layout; detail tabs (Summary, Relations, Appearances, Notes); drawer-based create/edit.

8) Settings & polish
- Settings layout alignment; accessibility sweep; motion prefs; responsive tuning; empty states.

9) Testing & hardening
- Update vitest component tests to new primitives/layouts.
- Update Playwright flows and selectors to match new IA and drawers.
- Add visual regression baselines where coverage is thin.

## Dependencies
- Design assets: palette, typography choice (e.g., Satoshi/IBM Plex Sans), spacing/radius tokens.
- Existing component library (Bits UI) compatibility with new shells/drawers.
- Command palette/shortcut mapping decisions; confirm key bindings.
- Test fixtures and seeded data for dashboard/workspace/review/analytics/serial pages.
- Playwright environment updates for new selectors and drawer patterns.

## Risks & Mitigations
- Selector churn breaking tests → establish stable data-ids and update helpers before page rewrites.
- Scope creep into backend changes → enforce UI-only policy per phase; log follow-ups separately.
- Performance in analytics/serial views → lazy-load heavy charts; reuse data loaders.
- Accessibility regressions → run automated a11y checks and manual keyboard-only passes per page.

## Validation
- Low-fidelity wireframes for IA approval before build; clickable prototype for navigation.
- Per-page acceptance checklist: layout, key actions, drawers, keyboard shortcuts, a11y basics.
- Regression suite: component (vitest-browser-svelte) + Playwright flows for Dashboard, Workspace, Review, Analytics, Serial.

## Deliverables
- Implemented AppShell and page redesigns per phases above.
- Updated tests and selectors.
- Theme tokens documented and applied across pages.
- Updated task list in docs/implementation/tasks.md.
