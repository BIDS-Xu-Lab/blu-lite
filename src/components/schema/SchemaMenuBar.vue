<template>
  <div class="flex items-center gap-1 px-3 h-full bg-white">
    <!-- New -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      v-tooltip.bottom="'Create a new blank schema'"
      @click="handleNew"
    >
      <font-awesome-icon :icon="['fas', 'file-circle-plus']" class="text-xs text-gray-500" />
      <span>New</span>
    </button>

    <!-- Load from File -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      v-tooltip.bottom="'Load schema from a JSON file'"
      @click="handleLoadFile"
    >
      <font-awesome-icon :icon="['fas', 'folder-open']" class="text-xs text-gray-500" />
      <span>Load File</span>
    </button>

    <!-- Load Current -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      :class="{ 'opacity-40 cursor-default': !schemaStore.isLoaded }"
      :disabled="!schemaStore.isLoaded"
      v-tooltip.bottom="'Load the currently active schema for editing'"
      @click="handleLoadCurrent"
    >
      <font-awesome-icon :icon="['fas', 'rotate']" class="text-xs text-gray-500" />
      <span>Load Current</span>
    </button>

    <div class="w-px h-5 bg-gray-200 mx-1"></div>

    <!-- Save to File -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      :class="{ 'opacity-40 cursor-default': !editorStore.draft }"
      :disabled="!editorStore.draft"
      v-tooltip.bottom="'Save schema to a JSON file'"
      @click="handleSave"
    >
      <font-awesome-icon :icon="['fas', 'floppy-disk']" class="text-xs text-gray-500" />
      <span>Save</span>
    </button>

    <!-- Apply to Session -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      :class="{ 'opacity-40 cursor-default': !editorStore.draft || !editorStore.isValid }"
      :disabled="!editorStore.draft || !editorStore.isValid"
      v-tooltip.bottom="'Apply this schema to the current annotation session'"
      @click="handleApply"
    >
      <font-awesome-icon :icon="['fas', 'check-circle']" class="text-xs text-green-600" />
      <span>Apply</span>
    </button>

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Validation status -->
    <div v-if="editorStore.draft && !editorStore.isValid" class="flex items-center gap-1.5 text-xs text-red-500">
      <font-awesome-icon :icon="['fas', 'triangle-exclamation']" />
      <span>{{ editorStore.validationErrors.length }} error(s)</span>
    </div>
    <div v-else-if="editorStore.draft && editorStore.isValid" class="flex items-center gap-1.5 text-xs text-green-600">
      <font-awesome-icon :icon="['fas', 'circle-check']" />
      <span>Valid</span>
    </div>
  </div>
</template>

<script setup>
import { useSchemaEditorStore } from '../../stores/schemaEditorStore.js'
import { useSchemaStore } from '../../stores/schemaStore.js'
import { validateSchema } from '../../utils/validators.js'
import { useToast } from 'primevue/usetoast'

const editorStore = useSchemaEditorStore()
const schemaStore = useSchemaStore()
const toast = useToast()

function handleNew() {
  if (editorStore.isDirty) {
    if (!confirm('You have unsaved changes. Create a new schema anyway?')) return
  }
  editorStore.createNew()
}

async function handleLoadFile() {
  if (editorStore.isDirty) {
    if (!confirm('You have unsaved changes. Load a different schema?')) return
  }
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }],
      multiple: false,
    })
    const file = await fileHandle.getFile()
    const text = await file.text()
    const parsed = JSON.parse(text)
    validateSchema(parsed)
    editorStore.loadFromObject(parsed)
    toast.add({ severity: 'success', summary: 'Schema loaded', life: 2000 })
  } catch (err) {
    if (err.name === 'AbortError') return
    toast.add({ severity: 'error', summary: 'Load failed', detail: err.message, life: 4000 })
  }
}

function handleLoadCurrent() {
  if (!schemaStore.isLoaded) return
  if (editorStore.isDirty) {
    if (!confirm('You have unsaved changes. Load the current schema?')) return
  }
  editorStore.loadFromObject(schemaStore.schema)
  toast.add({ severity: 'info', summary: 'Current schema loaded into editor', life: 2000 })
}

async function handleSave() {
  if (!editorStore.draft) return
  if (!editorStore.isValid) {
    toast.add({ severity: 'warn', summary: 'Fix validation errors before saving', detail: editorStore.validationErrors.join('; '), life: 4000 })
    return
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: (editorStore.draft.name || 'schema').replace(/\s+/g, '_') + '.json',
      types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }],
    })
    const writable = await handle.createWritable()
    await writable.write(JSON.stringify(editorStore.draft, null, 2))
    await writable.close()
    editorStore.isDirty = false
    toast.add({ severity: 'success', summary: 'Schema saved to file', life: 2000 })
  } catch (err) {
    if (err.name === 'AbortError') return
    toast.add({ severity: 'error', summary: 'Save failed', detail: err.message, life: 4000 })
  }
}

function handleApply() {
  if (!editorStore.draft || !editorStore.isValid) return
  schemaStore.loadSchema(JSON.parse(JSON.stringify(editorStore.draft)))
  toast.add({ severity: 'success', summary: 'Schema applied to session', life: 2000 })
}
</script>
