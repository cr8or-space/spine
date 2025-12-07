# Inline SVG Audit

This document lists all inline SVGs found in the codebase and their Lucide icon equivalents.

## Summary

| Category | Files | SVG Instances | Unique Icons |
|----------|-------|---------------|--------------|
| Components | 5 | 8 | 6 |
| Routes | 14 | ~50 | 18 |
| **Total** | **19** | **~58** | **~20** |

## Icons by Lucide Equivalent

### Common Icons (Used in Multiple Places)

| SVG Path | Lucide Icon | Usage Count | Files |
|----------|-------------|-------------|-------|
| `M12 5v14M5 12h14` | `Plus` | 8 | Button icons, EmptyState, Tab toolbars |
| `M18 6L6 18M6 6l12 12` | `X` | 7 | Dialog close, SearchInput clear, close buttons |
| `M6 9l6 6 6-6` | `ChevronDown` | 2 | Select, FilterSelect dropdowns |
| `circle+11,11,r8 + M21 21l-4.35-4.35` | `Search` | 1 | SearchInput |
| Settings gear (complex path) | `Settings` | 2 | Project settings, layout nav |
| Book open paths | `BookOpen` | 3 | Bible nav, chapter stats, appearances meta |
| `M19 12H5M12 19l-7-7 7-7` | `ArrowLeft` | 1 | Back navigation |

### Structure/Hierarchy Icons

| SVG Path | Lucide Icon | Usage | Files |
|----------|-------------|-------|-------|
| `polyline points="9 18 15 12 9 6"` | `ChevronRight` | Tree expand toggle | OutlineTree.svelte |
| File with text icon | `FileText` | Chapter/Scene nodes | OutlineTree.svelte |
| Bookshelf paths | `Library` | Arc nodes | OutlineTree.svelte |
| Hook indicator paths | `FileImage` | Hook indicator | OutlineTree.svelte |

### Entity/Domain Icons

| SVG Path | Lucide Icon | Usage | Files |
|----------|-------------|-------|-------|
| User path | `User` | Traits count | CharacterTab.svelte |
| Multiple users path | `Users` | Relationships count | CharacterTab.svelte, detail pages |
| Trash can path | `Trash2` | Delete actions | +page.svelte |
| Edit/pencil path | `SquarePen` | Workspace nav | +layout.svelte |
| Type icon (T) | `Type` | Word count stat | +page.svelte |
| Check mark polyline | `Check` | Beat completion | StructureEditor.svelte |

### Action Icons

| SVG Path | Lucide Icon | Usage | Files |
|----------|-------------|-------|-------|
| Plus in circle | `PlusCircle` | EmptyState default | EmptyState.svelte |
| History/clock | `History` | Draft history | DraftHistory.svelte |
| Analysis chart | `BarChart3` | Analysis panel | AnalysisPanel.svelte |
| Save | `Save` | Save content | ContentEditor.svelte |
| Wand/magic | `Wand2` | Generate content | ContentEditor.svelte |

## Files Requiring Migration

### lib/components (Priority: High - Shared Components)

1. **Dialog.svelte** (line 36)
   - X icon for close button
   - Replace with: `X` from lucide-svelte

2. **Select.svelte** (line 42)
   - ChevronDown for dropdown indicator
   - Replace with: `ChevronDown` from lucide-svelte

3. **EmptyState.svelte** (line 21)
   - PlusCircle as default icon
   - Replace with: `PlusCircle` from lucide-svelte

4. **SearchInput.svelte** (lines 11, 23)
   - Search icon (magnifying glass)
   - X icon for clear button
   - Replace with: `Search`, `X` from lucide-svelte

5. **FilterSelect.svelte** (line 24)
   - ChevronDown for dropdown indicator
   - Replace with: `ChevronDown` from lucide-svelte

### routes (Priority: Medium)

6. **+page.svelte** (lines 95, 124, 130, 146, 156)
   - Plus icon (new project button)
   - BookOpen icon (chapter count)
   - Type icon (word count)
   - Settings icon (settings link)
   - Trash2 icon (delete button)

7. **projects/[id]/+layout.svelte** (lines 28, 45, 49, 54)
   - ArrowLeft (back navigation)
   - BookOpen (bible nav)
   - SquarePen (workspace nav)
   - Settings (settings nav)

8. **Bible Tab Files** (6 files: Character, Location, Faction, WorldRule, PlotThread, Timeline)
   - Plus icon (new entity button)
   - Various meta icons (User, Users, BookOpen)

9. **Bible Detail Pages** (6 files)
   - ArrowLeft (back navigation)
   - Various entity-specific icons

10. **Workspace Files** (4 files)
    - OutlineTree: ChevronRight, BookOpen, Library, FileText, FileImage, Plus
    - StructureEditor: Check, X
    - ContentEditor: Save, Wand2, X, BarChart3
    - DraftHistory: X, History
    - AnalysisPanel: X, BarChart3

## Migration Strategy

### Phase 1: Component Library
1. Migrate shared components first (Dialog, Select, SearchInput, etc.)
2. These provide immediate benefit as they're used across the app

### Phase 2: Layout and Navigation
1. Project layout navigation icons
2. Main page (project list)

### Phase 3: Domain Components
1. Bible tabs (6 files)
2. Bible detail pages (6 files)
3. Workspace components (5 files)

## Implementation Notes

1. **Import pattern**:
   ```typescript
   import { X, ChevronDown, Plus } from 'lucide-svelte';
   ```

2. **Usage pattern**:
   ```svelte
   <!-- Before -->
   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
     <path d="M18 6L6 18M6 6l12 12" />
   </svg>

   <!-- After -->
   <X size={16} />
   ```

3. **Sizing**: Lucide icons default to 24x24, use `size` prop to adjust

4. **Styling**: Use `class` prop for additional styling, icons inherit `currentColor`

## Task: 5.IC.3 - Replace Inline SVGs with Lucide Icons

This task should be executed after 5.IC.1 (install) and 5.IC.2 (audit) are complete.
Estimated file changes: ~19 files
