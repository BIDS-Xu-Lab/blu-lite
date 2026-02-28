<template>
  <div class="flex items-center gap-2">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      v-tooltip.bottom="'Load annotation schema'"
      @click="handleLoadSchema"
    >
      <font-awesome-icon :icon="['fas', 'project-diagram']" class="text-xs text-gray-500" />
      <span>Schema</span>
    </button>
    <span v-if="schemaStore.isLoaded" class="text-xs bg-yale-50 text-yale-500 px-2 py-0.5 rounded font-medium">
      {{ schemaStore.schemaName }}
    </span>
  </div>
</template>

<script setup>
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useSchema } from '../../../composables/useSchema.js'

const schemaStore = useSchemaStore()
const { loadSchemaFromFile } = useSchema()

async function handleLoadSchema() {
  try {
    await loadSchemaFromFile()
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('Failed to load schema:', e)
      alert('Failed to load schema: ' + e.message)
    }
  }
}
</script>
