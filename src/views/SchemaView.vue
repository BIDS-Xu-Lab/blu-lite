<template>
  <div class="schema-view">
    <!-- Header -->
    <header class="border-b border-gray-200">
      <SchemaMenuBar />
    </header>

    <!-- Body -->
    <div class="schema-body">
      <template v-if="editorStore.draft">
        <div class="w-72 flex-shrink-0 h-full">
          <TypeListPanel />
        </div>
        <div class="flex-1 min-w-0 h-full">
          <TypeDetailPanel />
        </div>
      </template>
      <div v-else class="flex items-center justify-center w-full h-full text-gray-400">
        <div class="text-center">
          <font-awesome-icon :icon="['fas', 'puzzle-piece']" class="text-5xl text-gray-200 mb-4" />
          <p class="text-sm mb-1">No schema loaded</p>
          <p class="text-xs">Click <strong>New</strong> to create a blank schema or <strong>Load File</strong> to open an existing one.</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-200 bg-gray-50 flex items-center px-4 gap-4 text-xs text-gray-500">
      <template v-if="editorStore.draft">
        <span>Entities: {{ editorStore.entities.length }}</span>
        <span>Relations: {{ editorStore.relations.length }}</span>
        <span v-if="editorStore.isDirty" class="flex items-center gap-1 text-amber-500">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
          Unsaved changes
        </span>
      </template>
      <span v-else>Schema Editor</span>
    </footer>
  </div>
</template>

<script setup>
import { onBeforeRouteLeave } from 'vue-router'
import { useSchemaEditorStore } from '../stores/schemaEditorStore.js'
import SchemaMenuBar from '../components/schema/SchemaMenuBar.vue'
import TypeListPanel from '../components/schema/TypeListPanel.vue'
import TypeDetailPanel from '../components/schema/TypeDetailPanel.vue'

const editorStore = useSchemaEditorStore()

onBeforeRouteLeave(() => {
  if (editorStore.isDirty) {
    return confirm('You have unsaved schema changes. Leave anyway?')
  }
})
</script>

<style scoped>
.schema-view {
  display: grid;
  grid-template-rows: 3rem 1fr 1.25rem;
  height: 100%;
  overflow: hidden;
}

.schema-body {
  display: flex;
  overflow: hidden;
}
</style>
