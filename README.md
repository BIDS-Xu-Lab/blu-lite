# Blu Lite

A pure-frontend text annotation tool for entity annotation, relation annotation, and concept normalization. Runs entirely in the browser — no server, no database. All data is persisted directly to your local filesystem via the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API).

## Features

- **Entity annotation** — select text spans and assign entity types with custom attributes
- **Overlapping annotations** — multiple entities can cover the same text span
- **Concept normalization** — attach structured attribute values (text, enum) to entities
- **Schema-driven** — load a JSON schema to define entity types, relations, and attributes
- **Local file I/O** — open a directory of `.txt`/`.json` files; edits save back to disk
- **Search & highlight** — keyword search across the active document
- **No install required** — open in a browser and go

## Browser Requirement

Requires a **Chromium-based browser** (Chrome, Edge). Firefox and Safari do not fully support the File System Access API.

## Getting Started

```bash
bun install
bun run dev       # http://localhost:5173
```

Or open the hosted version and click **Load Files** to pick a local directory.

## Schema Format

Define entity types and their attributes in a JSON schema file:

```json
{
  "name": "My Project",
  "entity": [
    {
      "name": "disease",
      "attrs": [
        { "name": "concept", "value_type": "text", "values": [], "default_value": "" },
        { "name": "certainty", "value_type": "enum", "values": ["positive", "negated", "possible"], "default_value": "positive" }
      ]
    }
  ],
  "relation": []
}
```

Load a schema via the **Schema** button in the menu bar. Sample schemas and annotated documents are available via the **Samples** dropdown.

## Tech Stack

- [Vue 3](https://vuejs.org/) + [Pinia](https://pinia.vuejs.org/) + [Vue Router](https://router.vuejs.org/)
- [PrimeVue 4](https://primevue.org/) (Aura theme)
- [TailwindCSS v4](https://tailwindcss.com/)
- [Vite 7](https://vitejs.dev/) + [Bun](https://bun.sh/)

## Project Structure

```
src/
  views/          # LandingView, AnnotationView, EvaluationView
  components/     # annotation/, common/ UI components
  stores/         # Pinia stores: schema, file, annotation, ui
  composables/    # useAnnotation, useTextRenderer, useSchema
  utils/          # colors, validators, fileConverters
  samples/        # built-in demo schema + annotated document
```

## License

MIT
