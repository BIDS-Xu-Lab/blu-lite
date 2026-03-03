<template>
  <div
    v-if="annotationStore.showTypeSelector"
    ref="selectorRef"
    class="fixed z-50"
    :style="{ left: popupPosition.left + 'px', top: popupPosition.top + 'px' }"
  >
    <div class="bg-white border border-gray-200 rounded-lg shadow-xl p-2 min-w-[200px] max-h-[70vh] flex flex-col">
      <div class="text-xs text-gray-400 px-2 pb-1 mb-1 border-b border-gray-100">Select entity type</div>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Search entity type..."
        class="w-full text-sm px-2 py-1.5 mb-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
      />
      <div class="overflow-y-auto flex-1 min-h-[120px]">
        <button
          v-for="entityType in filteredEntityTypes"
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
        <div
          v-if="filteredEntityTypes.length === 0"
          class="px-2 py-3 text-xs text-gray-400"
        >
          No entity type matches "{{ searchQuery }}".
        </div>
      </div>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useAnnotationStore } from '../../../stores/annotationStore.js'

const schemaStore = useSchemaStore()
const annotationStore = useAnnotationStore()
const selectorRef = ref(null)
const searchInputRef = ref(null)
const searchQuery = ref('')
const popupPosition = ref({ left: 0, top: 0 })

const filteredEntityTypes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return schemaStore.entityTypes
  return schemaStore.entityTypes.filter((entityType) => entityType.name.toLowerCase().includes(query))
})

const VIEWPORT_PADDING = 8

function updatePopupPosition() {
  if (!annotationStore.showTypeSelector) return

  const anchorX = annotationStore.typeSelectorPosition.x ?? 0
  const anchorY = annotationStore.typeSelectorPosition.y ?? 0
  const popupWidth = selectorRef.value?.offsetWidth ?? 220
  const popupHeight = selectorRef.value?.offsetHeight ?? 320
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = anchorX
  let top = anchorY

  if (left + popupWidth + VIEWPORT_PADDING > viewportWidth) {
    left = viewportWidth - popupWidth - VIEWPORT_PADDING
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING
  }

  if (top + popupHeight + VIEWPORT_PADDING > viewportHeight) {
    top = anchorY - popupHeight
  }
  if (top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING
  }

  popupPosition.value = { left, top }
}

watch(() => annotationStore.showTypeSelector, async (visible) => {
  if (!visible) return
  await nextTick()
  updatePopupPosition()
  searchInputRef.value?.focus()
})

watch(() => annotationStore.typeSelectorPosition, async () => {
  if (!annotationStore.showTypeSelector) return
  await nextTick()
  updatePopupPosition()
}, { deep: true })

watch(searchQuery, async () => {
  if (!annotationStore.showTypeSelector) return
  await nextTick()
  updatePopupPosition()
})

function handleViewportChange() {
  updatePopupPosition()
}

onMounted(() => {
  window.addEventListener('resize', handleViewportChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleViewportChange)
})

function selectEntityType(entityType) {
  annotationStore.createAnnotation(entityType.name, entityType.attrs || [])
  annotationStore.showTypeSelector = false
  searchQuery.value = ''
  window.getSelection()?.removeAllRanges()
}

function cancelSelection() {
  annotationStore.showTypeSelector = false
  annotationStore.clearPendingSelection()
  searchQuery.value = ''
  window.getSelection()?.removeAllRanges()
}
</script>
