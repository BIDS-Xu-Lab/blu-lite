<template>
  <div class="flex flex-col h-full bg-white">
    <div v-if="!fileStore.activeFile" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
      <div class="text-center">
        <font-awesome-icon :icon="['fas', 'file-circle-plus']" class="text-3xl text-gray-300 mb-3" />
        <p>Select a file from the list to start annotating</p>
      </div>
    </div>
    <template v-else>
      <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span class="text-sm font-medium text-gray-700">
          {{ fileStore.activeFile.filename.split('/').pop() }}
        </span>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-400">
            {{ annotationStore.entityCount }} entities
          </span>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <AnnotatedText />
      </div>
    </template>

    <EntityTypeSelector />
    <EntityContextMenu />
    <AttributeEditor />
  </div>
</template>

<script setup>
import { useFileStore } from '../../../stores/fileStore.js'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import AnnotatedText from './AnnotatedText.vue'
import EntityTypeSelector from './EntityTypeSelector.vue'
import EntityContextMenu from './EntityContextMenu.vue'
import AttributeEditor from './AttributeEditor.vue'

const fileStore = useFileStore()
const annotationStore = useAnnotationStore()
</script>
