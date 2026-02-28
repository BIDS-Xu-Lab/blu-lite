# CLAUDE.md - Blu Lite Project Guide

## Project Overview

Blu Lite is a pure-frontend text annotation tool for entity annotation, relation annotation, and concept normalization. It runs entirely in the browser with no backend server - all data persistence is through the browser's File System Access API directly to the user's local disk.

## Tech Stack

- **Runtime / Bundler**: Bun + Vite 7
- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **State Management**: Pinia (setup store style with `defineStore`)
- **UI Components**: PrimeVue 4 (Aura theme preset, Yale blue primary)
- **CSS**: TailwindCSS v4 (`@tailwindcss/vite` plugin, `@theme` directive for custom colors)
- **Icons**: Font Awesome Free (fas, far, fab) via `@fortawesome/vue-fontawesome`
- **Routing**: Vue Router 5 with `createWebHashHistory` (for GitHub Pages)

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server (port 5173)
bun run build        # Production build to dist/
bun run preview      # Preview production build
```

## Project Structure

```
src/
  main.js                              # App bootstrap: Pinia, PrimeVue, Font Awesome, router
  App.vue                              # Root component with <router-view>
  router/index.js                      # Hash router: / (landing), /annotate, /evaluate
  assets/styles/
    main.css                           # TailwindCSS imports + Yale blue palette (@theme)
    annotations.css                    # Annotation text rendering styles
  layouts/
    LandingLayout.vue                  # Full-page layout for landing
    AppLayout.vue                      # Grid layout: 4rem sidebar + main content
  views/
    LandingView.vue                    # Marketing landing page
    AnnotationView.vue                 # Main annotation workbench (3-row grid: header/main/footer)
    EvaluationView.vue                 # Evaluation view (stub)
  components/
    common/
      AppSidebar.vue                   # Left nav sidebar (4rem wide, spans all rows)
      AppHeader.vue                    # App header bar
      AppFooter.vue                    # App footer bar
    annotation/
      menu/
        AnnotationMenuBar.vue          # Top menu bar composing all menu items
        FileMenu.vue                   # File > Load Files, Dump Files, Export (TieredMenu)
        SchemaMenu.vue                 # Schema loader button + schema name display
        SearchInput.vue                # Keyword search + text highlighting
        MagicWandButton.vue            # Auto-annotation placeholder
        ToggleButtons.vue              # Show Attrs / Show IDs toggle buttons
        SamplesDropdown.vue            # Load demo data (imports from src/samples/)
      filelist/
        FileListPanel.vue             # Left panel: file list with pagination
        FileListHeader.vue            # File count + sort selector
        FileListItem.vue              # Single file row (name, entity count, dirty indicator)
      editor/
        EditorPanel.vue               # Editor container: AnnotatedText + overlays
        AnnotatedText.vue             # Main text renderer using renderBlocks
        EntityLabel.vue               # Colored badge showing entity type + attributes
        EntityTypeSelector.vue        # Floating popup for selecting entity type on text selection
        EntityContextMenu.vue         # Right-click menu: Edit Attributes, Delete
        AttributeEditor.vue           # PrimeVue Dialog for editing entity attributes
  stores/
    schemaStore.js                    # Schema state, entity colors, getEntityAttrs/Color
    fileStore.js                      # Directory handle, files[], active file, save/load/dump
    annotationStore.js                # Annotation CRUD, pending selection, editing state
    uiStore.js                        # UI toggles (showAttributes, showAnnotationId, search, pagination)
  composables/
    useAnnotation.js                  # mouseup handler, DOM offset computation, selection flow
    useTextRenderer.js                # Segment computation + renderBlocks for annotation display
    useSchema.js                      # Schema file picker and validation
  utils/
    colors.js                         # 12 preset entity colors + golden angle HSL fallback
    validators.js                     # validateSchema(), validateAnnotationFile()
    fileConverters.js                 # txtToAnnotationJson() - .txt to annotation JSON
    constants.js                      # PAGE_SIZE, SUPPORTED_EXTENSIONS
  samples/
    basic/
      schema.json                     # Sample schema: disease, drug entities + treatment relation
      sample_note.json                # Sample annotated note with 8 entities
```

## Architecture & Key Patterns

### Layout System

- **AppLayout**: CSS Grid with `grid-template-columns: 4rem 1fr`. Sidebar spans all rows.
- **AnnotationView**: 3-row grid (`3rem 1fr 1.25rem`) for menu bar, main content, footer stats.
- Main content splits into FileListPanel (w-72) and EditorPanel (flex-1).

### Text Annotation Rendering

Text is rendered using a **segment-based span approach** (NOT contentEditable):

1. **`useTextRenderer.js`** splits text into segments at every entity boundary (begin/end offsets)
2. Each segment knows which entities cover it (`entities[]` array)
3. Segments are merged into **render blocks**:
   - `plain` blocks: consecutive unannotated text
   - `annotated` blocks: consecutive annotated segments merged when they share entity ranges
4. **`AnnotatedText.vue`** renders blocks:
   - Plain blocks: simple `<span>` with `data-offset`
   - Annotated blocks: `inline-flex column` container with highlighted text on top and entity labels row below
5. Each `<span>` has a `data-offset` attribute for DOM-to-offset mapping during text selection

### Overlapping Annotations

Multiple annotations can cover the same text span. The renderBlocks logic:
- Merges overlapping annotated segments into a single block
- Collects ALL unique entities across merged segments
- Displays all entity labels in a flex-wrap row below the text

### Annotation Data Model

Annotations are stored in an `indexes` object keyed by string offset:

```json
{
  "filename": "example.json",
  "content": "The patient has diabetes...",
  "indexes": {
    "16": {
      "Entity": [
        {
          "id": "E1",
          "semantic": "disease",
          "begin": 16,
          "end": 24,
          "type": "Entity",
          "attrs": {
            "concept": { "id": "A1", "attrKey": "concept", "attrValue": "E11.9", "attrType": "text" },
            "certainty": { "id": "A2", "attrKey": "certainty", "attrValue": "positive", "attrType": "enum" }
          }
        }
      ]
    }
  }
}
```

- **Creating an annotation** = inserting into `indexes[startOffset].Entity[]`
- **Deleting an annotation** = splicing from that array; clean up empty keys
- The `_dirty` flag tracks unsaved changes (excluded when saving to disk)

### Schema Format

```json
{
  "name": "Project Name",
  "entity": [
    {
      "name": "disease",
      "attrs": [
        { "name": "concept", "value_type": "text", "values": [], "default_value": "" },
        { "name": "certainty", "value_type": "enum", "values": ["positive", "negated", "possible", "NA"], "default_value": "NA" }
      ]
    }
  ],
  "relation": [
    { "name": "treatment", "attrs": [] }
  ]
}
```

### File I/O

- Uses **File System Access API** (`window.showDirectoryPicker({ mode: 'readwrite' })`)
- `.txt` files are auto-converted to annotation JSON on load (original `.txt` deleted)
- `.json` files are validated with `validateAnnotationFile()` before loading
- Save writes back to the same directory handle

### Entity Color System

- 12 preset color triples `{ bg, text, border }` assigned by entity type index
- Beyond 12, uses golden angle (137.508) HSL distribution for deterministic hue spread
- Colors assigned at schema load time in `schemaStore.entityColorMap`

### State Management

All Pinia stores use **setup store style** (function-based, not options):

- **`schemaStore`**: Schema data, entity colors. Must be loaded before file operations.
- **`fileStore`**: Directory handle, files array, active file index, sorting, save/dump.
- **`annotationStore`**: Annotation CRUD, pending selection state, entity type selector visibility (shared state to avoid composable instance isolation issues).
- **`uiStore`**: UI toggles, search query, pagination.

### Annotation Creation Flow

1. User selects text in `AnnotatedText.vue` -> `onMouseUp` fires
2. `useAnnotation.js` computes character offsets from DOM `data-offset` attributes
3. Sets `annotationStore.pendingSelection` and shows `EntityTypeSelector` at cursor position
4. User clicks entity type -> `annotationStore.createAnnotation()` inserts into indexes
5. `useTextRenderer` recomputes segments reactively -> view updates

## Styling

- **Primary color**: Yale blue (`#00356b`). Custom palette defined in `main.css` via TailwindCSS `@theme` directive (yale-50 through yale-900).
- **PrimeVue theme**: Aura preset with Yale blue override via `definePreset`. Dark mode disabled (`darkModeSelector: false`).
- **Light theme only**.

## Font Awesome Usage

All three free icon packs are registered globally:

```js
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'
library.add(fas, far, fab)
app.component('font-awesome-icon', FontAwesomeIcon)
```

Usage in templates:
```vue
<font-awesome-icon :icon="['fas', 'expand']" class="text-xs" />
```

## Routing

Uses `createWebHashHistory` for GitHub Pages compatibility. Routes:

| Path | Layout | View |
|------|--------|------|
| `/#/` | LandingLayout | LandingView |
| `/#/annotate` | AppLayout | AnnotationView |
| `/#/evaluate` | AppLayout | EvaluationView |

## Adding Sample Data

Sample datasets live in `src/samples/<name>/` with:
- `schema.json` - annotation schema
- `sample_note.json` - annotated document

Register new samples in `SamplesDropdown.vue` by importing the JSON files and adding a menu item.

## Known Constraints

- File System Access API requires a Chromium-based browser (Chrome, Edge). Firefox/Safari do not fully support it.
- The app is **pure frontend** - no server, no database. All data lives on the user's local filesystem.
- Evaluation view is currently a stub (Phase 11 of the plan).
- Relation annotation is defined in the schema format but not yet implemented in the UI.
- Magic Wand (auto-annotation) button is a placeholder.

## Implementation Plan

The full 12-phase implementation plan is at `.claude/plans/expressive-marinating-lagoon.md`. Phases 1-10 are mostly complete. Remaining work:
- **Phase 10**: File persistence polish (beforeunload warning, unsaved indicators)
- **Phase 11**: Evaluation view (multi-reviewer comparison, agreement metrics)
- **Phase 12**: Polish (keyboard shortcuts, loading states, toast notifications)
