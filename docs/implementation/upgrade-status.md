# Upgrade Implementation Status
This is a pure checklist file. No comments other than this one.

## Phase 1: Code Reduction (CR)

### 1.CR Generic Components
- [x] EntityCard component
- [x] EntityListPage component
- [x] CreateEntityDialog component

### 1.CR Tab Refactors
- [ ] CharacterTab refactor
- [ ] LocationTab refactor
- [ ] FactionTab refactor
- [ ] WorldRuleTab refactor
- [ ] PlotThreadTab refactor
- [ ] TimelineTab refactor

### 1.CR Exports
- [x] Update component exports

## Phase 2: Testing Infrastructure (TI)

### 2.TI Setup
- [x] Install vitest-browser-svelte dependencies
- [x] Update Vitest config for browser mode
- [x] Create test setup file for browser tests
- [x] Update Playwright config

### 2.TI Component Test Migrations
- [x] Button.test.ts migration
- [x] Card.test.ts migration
- [x] Dialog.test.ts migration
- [x] TextField.test.ts migration
- [x] Tabs.test.ts migration

### 2.TI New Component Tests
- [x] EntityCard tests
- [x] EntityListPage tests
- [x] CreateEntityDialog tests

### 2.TI Integration Tests
- [x] Bible flow integration test
- [x] Project flow integration test
- [x] Fix better-sqlite3 ESM compatibility for SSR preview mode (migrated to libsql)
- [x] Fix Playwright test timeouts (UI element selectors outdated)

## Phase 3: Tailwind CSS v4 (TW)

### 3.TW Setup
- [x] Install Tailwind CSS v4
- [x] Configure Tailwind v4 with Vite
- [x] Create Tailwind theme from existing design tokens
- [x] Create cn utility helper
- [x] Add Tailwind Prettier plugin

### 3.TW Component Migrations
- [ ] Button component migration
- [ ] Card component migration
- [ ] Badge component migration
- [ ] TextField component migration
- [ ] TextArea component migration
- [ ] Dialog component migration
- [ ] Remaining components migration

### 3.TW Layout Migrations
- [ ] Layout components migration
- [ ] Bible tab components migration

### 3.TW Cleanup
- [ ] Remove legacy CSS

## Phase 4: UI Accessibility (UA)

### 4.UA Setup
- [x] Install Bits UI

### 4.UA New Components
- [ ] AccessibleDialog component
- [ ] AccessibleTabs component
- [ ] AccessibleSelect component

### 4.UA Migrations
- [ ] Migrate Dialog usage
- [ ] Migrate Tabs usage
- [ ] Migrate Select usage

## Phase 5: Icon System (IC)

### 5.IC Setup
- [x] Install Lucide Svelte
- [x] Audit existing inline SVGs (see docs/implementation/svg-audit.md)

### 5.IC Migration
- [ ] Replace inline SVGs with Lucide icons (~58 instances in ~19 files)

## Phase 6: Architecture Preparation (AP)

### 6.AP Base Interfaces
- [x] Base Entity interface
- [x] Base Content interface
- [x] Spine interface
- [x] Validator interface

### 6.AP Type Extensions
- [x] Extend Character type from BaseEntity
- [x] Extend all Bible types from BaseEntity

### 6.AP Infrastructure
- [x] Content status transitions
- [x] Generic EntityRepository interface
- [x] Separate Shell from Workspace in UI

## Phase 7: Validation & Rendering (VR)

### 7.VR Components
- [ ] ValidationPanel component
- [ ] ValidationBadge component

### 7.VR Interfaces
- [ ] ReferenceExtractor interface
- [ ] ContentRenderer interface
