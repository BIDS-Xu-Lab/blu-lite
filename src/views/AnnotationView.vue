<template>
  <div class="annotation-view">
    <!-- Header: Menu Bar (3rem) -->
    <header class="annotation-header border-b border-gray-200 bg-white">
      <AnnotationMenuBar />
    </header>

    <!-- Main Section: File List + Editor + Guideline -->
    <div class="annotation-body">
      <div class="w-72 flex-shrink-0 h-full">
        <FileListPanel />
      </div>
      <div class="flex-1 min-w-0 h-full">
        <EditorPanel />
      </div>
      <GuidelinePanel v-if="uiStore.showGuideline && schemaStore.schema?.guideline" />
    </div>

    <!-- Footer (1rem) -->
    <footer class="annotation-footer border-t border-gray-200 bg-gray-50 flex items-center px-4 gap-4 text-xs text-gray-500">
      <span>Files: {{ fileStore.totalFiles }}</span>
      <span>Chars: {{ charCount }}</span>
      <span>Tokens: {{ annotationStore.tokenCount }}</span>
      <span>Entities: {{ annotationStore.entityCount }}</span>
      <span>Relations: {{ annotationStore.relationCount }}</span>
      <span class="ml-auto flex items-center gap-1">
        <template v-if="vocabStore.indexStatus === 'loading'">
          <font-awesome-icon :icon="['fas', 'spinner']" class="animate-spin text-yellow-500" />
          Loading Vocabulary ({{ vocabStore.loadProgress.percent }}%)...
        </template>
        <template v-else-if="vocabStore.indexStatus === 'ready'">
          <font-awesome-icon :icon="['fas', 'book-medical']" class="text-green-500" />
          Vocabulary Ready ({{ vocabStore.indexedDocCount.toLocaleString() }})
        </template>
        <template v-else-if="vocabStore.indexStatus === 'error'">
          <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="text-red-500" />
          Vocab Error
        </template>
      </span>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import AnnotationMenuBar from '../components/annotation/menu/AnnotationMenuBar.vue'
import FileListPanel from '../components/annotation/filelist/FileListPanel.vue'
import EditorPanel from '../components/annotation/editor/EditorPanel.vue'
import GuidelinePanel from '../components/annotation/editor/GuidelinePanel.vue'
import { useFileStore } from '../stores/fileStore.js'
import { useAnnotationStore } from '../stores/annotationStore.js'
import { useVocabularyStore } from '../stores/vocabularyStore.js'
import { useSchemaStore } from '../stores/schemaStore.js'
import { useUiStore } from '../stores/uiStore.js'

const fileStore = useFileStore()
const annotationStore = useAnnotationStore()
const vocabStore = useVocabularyStore()
const schemaStore = useSchemaStore()
const uiStore = useUiStore()

const charCount = computed(() => {
  const c = annotationStore.charCount
  return c.toLocaleString()
})

onMounted(() => {
  vocabStore.initVocabulary().catch(console.error)
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
