<template>
  <div class="annotation-view">
    <!-- Header: Menu Bar (3rem) -->
    <header class="annotation-header border-b border-gray-200 bg-white">
      <AnnotationMenuBar />
    </header>

    <!-- Main Section: File List + Editor -->
    <div class="annotation-body">
      <div class="w-72 flex-shrink-0 h-full">
        <FileListPanel />
      </div>
      <div class="flex-1 min-w-0 h-full">
        <EditorPanel />
      </div>
    </div>

    <!-- Footer (1rem) -->
    <footer class="annotation-footer border-t border-gray-200 bg-gray-50 flex items-center px-4 gap-4 text-xs text-gray-500">
      <span>Files: {{ fileStore.totalFiles }}</span>
      <span>Chars: {{ charCount }}</span>
      <span>Tokens: {{ annotationStore.tokenCount }}</span>
      <span>Entities: {{ annotationStore.entityCount }}</span>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AnnotationMenuBar from '../components/annotation/menu/AnnotationMenuBar.vue'
import FileListPanel from '../components/annotation/filelist/FileListPanel.vue'
import EditorPanel from '../components/annotation/editor/EditorPanel.vue'
import { useFileStore } from '../stores/fileStore.js'
import { useAnnotationStore } from '../stores/annotationStore.js'

const fileStore = useFileStore()
const annotationStore = useAnnotationStore()

const charCount = computed(() => {
  const c = annotationStore.charCount
  return c.toLocaleString()
})
</script>

<style scoped>
.annotation-view {
  display: grid;
  grid-template-rows: 3rem 1fr 1.25rem;
  height: 100%;
  overflow: hidden;
}

.annotation-body {
  display: flex;
  overflow: hidden;
}
</style>
