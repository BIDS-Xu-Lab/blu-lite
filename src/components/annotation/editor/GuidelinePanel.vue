<template>
  <div class="guideline-panel flex flex-col h-full border-l border-gray-200 bg-white">
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
      <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
        <font-awesome-icon :icon="['fas', 'book-open']" class="text-yale-500" />
        Guideline
      </span>
      <button
        class="text-gray-400 hover:text-gray-600 transition-colors"
        v-tooltip.left="'Close guideline'"
        @click="uiStore.toggleGuideline()"
      >
        <font-awesome-icon :icon="['fas', 'xmark']" class="text-xs" />
      </button>
    </div>
    <div
      class="guideline-content flex-1 overflow-y-auto px-4 py-3 prose prose-sm max-w-none"
      v-html="schemaStore.schema?.guideline"
    />
  </div>
</template>

<script setup>
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useUiStore } from '../../../stores/uiStore.js'

const schemaStore = useSchemaStore()
const uiStore = useUiStore()
</script>

<style scoped>
.guideline-panel {
  width: 400px;
  flex-shrink: 0;
}

.guideline-content :deep(h1),
.guideline-content :deep(h2),
.guideline-content :deep(h3),
.guideline-content :deep(h4) {
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.guideline-content :deep(h1) { font-size: 1rem; }
.guideline-content :deep(h2) { font-size: 0.9rem; }
.guideline-content :deep(h3) { font-size: 0.825rem; }

.guideline-content :deep(p) {
  margin-bottom: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #374151;
}

.guideline-content :deep(ul),
.guideline-content :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
  font-size: 0.8125rem;
  color: #374151;
}

.guideline-content :deep(li) {
  margin-bottom: 0.25rem;
}

.guideline-content :deep(strong) {
  font-weight: 600;
}

.guideline-content :deep(em) {
  font-style: italic;
}

.guideline-content :deep(code) {
  background: #f3f4f6;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.75rem;
  font-family: monospace;
}

.guideline-content :deep(blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 0.75rem;
  margin: 0.5rem 0;
  color: #6b7280;
}

.guideline-content :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0.75rem 0;
}
</style>
