<template>
  <div
    v-if="annotationStore.showTypeSelector"
    class="fixed z-50"
    :style="{ left: annotationStore.typeSelectorPosition.x + 'px', top: annotationStore.typeSelectorPosition.y + 'px' }"
  >
    <div class="bg-white border border-gray-200 rounded-lg shadow-xl p-2 min-w-[140px]">
      <div class="text-xs text-gray-400 px-2 pb-1 mb-1 border-b border-gray-100">Select entity type</div>
      <button
        v-for="entityType in schemaStore.entityTypes"
        :key="entityType.name"
        class="w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2 hover:bg-gray-50 transition-colors"
        @click="selectEntityType(entityType)"
      >
        <span
          class="w-3 h-3 rounded-sm flex-shrink-0"
          :style="{ backgroundColor: schemaStore.getEntityColor(entityType.name).bg, border: '1px solid ' + schemaStore.getEntityColor(entityType.name).border }"
        ></span>
        {{ entityType.name }}
      </button>
      <div class="border-t border-gray-100 mt-1 pt-1">
        <button
          class="w-full text-left px-2 py-1 text-xs text-gray-400 rounded hover:bg-gray-50"
          @click="cancelSelection"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
  <!-- Backdrop -->
  <div
    v-if="annotationStore.showTypeSelector"
    class="fixed inset-0 z-40"
    @click="cancelSelection"
  ></div>
</template>

<script setup>
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useAnnotationStore } from '../../../stores/annotationStore.js'

const schemaStore = useSchemaStore()
const annotationStore = useAnnotationStore()

function selectEntityType(entityType) {
  annotationStore.createAnnotation(entityType.name, entityType.attrs || [])
  annotationStore.showTypeSelector = false
  window.getSelection()?.removeAllRanges()
}

function cancelSelection() {
  annotationStore.showTypeSelector = false
  annotationStore.clearPendingSelection()
  window.getSelection()?.removeAllRanges()
}
</script>
