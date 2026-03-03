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

    <!-- Save -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      :class="{ 'opacity-40 cursor-default': !editorStore.draft }"
      :disabled="!editorStore.draft"
      v-tooltip.bottom="'Save schema to file and apply to annotation session'"
      @click="handleSave"
    >
      <font-awesome-icon :icon="['fas', 'floppy-disk']" class="text-xs text-gray-500" />
      <span>Save</span>
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
import { useToast } from 'primevue/usetoast'

const editorStore = useSchemaEditorStore()
const schemaStore = useSchemaStore()
const toast = useToast()

function handleNew() {
  if (editorStore.isDirty) {
    if (!confirm('You have unsaved changes. Create a new schema anyway?')) return
  }
  if (schemaStore.isLoaded) {
    if (!confirm('This will overwrite the current schema in use when saved. Continue?')) return
  }
  editorStore.createNew()
}

async function handleSave() {
  if (!editorStore.draft) return
  if (!editorStore.isValid) {
    toast.add({ severity: 'warn', summary: 'Fix validation errors before saving', detail: editorStore.validationErrors.join('; '), life: 4000 })
    return
  }
  try {
    let fileHandle = schemaStore.schemaFileHandle
    // If no existing FileHandle, prompt user to pick a save location
    if (!fileHandle) {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: (editorStore.draft.name || 'schema').replace(/\s+/g, '_') + '.json',
        types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }],
      })
    }
    // Write to file
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(editorStore.draft, null, 2))
    await writable.close()
    // Apply to annotation session (with FileHandle)
    const schemaSnapshot = JSON.parse(JSON.stringify(editorStore.draft))
    schemaStore.loadSchema(schemaSnapshot, fileHandle)
    editorStore.isDirty = false
    toast.add({ severity: 'success', summary: 'Schema saved and applied', life: 2000 })
  } catch (err) {
    if (err.name === 'AbortError') return
    toast.add({ severity: 'error', summary: 'Save failed', detail: err.message, life: 4000 })
  }
}
</script>
