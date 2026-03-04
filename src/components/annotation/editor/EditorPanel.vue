<template>
  <div class="flex flex-col h-full bg-white">
    <div v-if="!fileStore.activeFile" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
      <div class="text-center">
        <font-awesome-icon :icon="['fas', 'file-circle-plus']" class="text-3xl text-gray-300 mb-3" />
        <p>Select a file from the list to start annotating</p>
      </div>
    </div>
    <template v-else>
      <!-- Relation mode banner (floating, does not affect layout) -->
      <div
        v-if="annotationStore.relationMode && annotationStore.pendingRelation"
        class="relation-mode-banner-float"
      >
        <div class="relation-mode-banner flex items-center justify-between px-4 py-1.5 text-sm">
          <span>
            <font-awesome-icon :icon="['fas', 'arrow-right-long']" class="mr-1" />
            Click a compatible entity label to add relation(s)
            <template v-if="targetEntityTypeHint">
              :
              <strong>{{ targetEntityTypeHint }}</strong>
            </template>
          </span>
          <button
            class="text-xs px-2 py-0.5 rounded bg-white/70 hover:bg-white border border-blue-300 text-blue-600 ml-4"
            @click="annotationStore.cancelRelationMode()"
          >
            Cancel <span class="text-[0.6rem] opacity-60">(Esc)</span>
          </button>
        </div>
      </div>
      
      <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span class="text-sm font-medium text-gray-700">
          {{ fileStore.activeFile.filename.split('/').pop() }}
        </span>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-400">
            {{ annotationStore.entityCount }} entities
          </span>
          <span v-if="annotationStore.relationCount > 0" class="text-xs text-gray-400">
            {{ annotationStore.relationCount }} relations
          </span>
        </div>
      </div>

      <div ref="scrollContainerRef" class="flex-1 overflow-y-auto overflow-x-hidden relative">
        

        <AnnotatedText />
        <RelationOverlay :scroll-container="scrollContainerRef" />
      </div>
    </template>

    <EntityTypeSelector />
    <EntityContextMenu />
    <AttributeEditor />
    <ConceptMappingPanel />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFileStore } from '../../../stores/fileStore.js'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import AnnotatedText from './AnnotatedText.vue'
import EntityTypeSelector from './EntityTypeSelector.vue'
import EntityContextMenu from './EntityContextMenu.vue'
import AttributeEditor from './AttributeEditor.vue'
import RelationOverlay from './RelationOverlay.vue'
import ConceptMappingPanel from './ConceptMappingPanel.vue'

const fileStore = useFileStore()
const annotationStore = useAnnotationStore()

const scrollContainerRef = ref(null)

const targetEntityTypeHint = computed(() => {
  if (!annotationStore.pendingRelation) return ''
  return annotationStore.pendingRelation.targetEntityTypes?.join(', ') ?? ''
})

function handleKeydown(event) {
  if (event.key === 'Escape' && annotationStore.relationMode) {
    annotationStore.cancelRelationMode()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>
