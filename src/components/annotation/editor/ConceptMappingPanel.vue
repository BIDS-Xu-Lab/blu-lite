<template>
  <div
    v-if="annotationStore.showConceptMapping"
    ref="panelRef"
    class="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col"
    :style="panelStyle"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg cursor-move"
      @mousedown="startDrag"
    >
      <div class="flex items-center gap-2 min-w-0">
        <font-awesome-icon :icon="['fas', 'book-medical']" class="text-sm text-yale-500 flex-shrink-0" />
        <div class="min-w-0 flex flex-col">
          <span class="text-sm font-medium text-gray-700 truncate">
            {{ targetLabel }}
          </span>
          <span v-if="targetAnnotatedText" class="text-xs text-gray-400 truncate italic">
            "{{ targetAnnotatedText }}"
          </span>
        </div>
      </div>
      <button class="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0" @click="close">
        <font-awesome-icon :icon="['fas', 'xmark']" />
      </button>
    </div>

    <!-- Current mapping -->
    <div v-if="currentConcept" class="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
      <div class="text-xs">
        <span class="font-semibold text-blue-700">{{ currentConcept.concept }}</span>
        <span class="text-blue-500 ml-1">({{ currentConcept.vocabulary }})</span>
      </div>
      <button class="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5" @click="clearMapping">
        <font-awesome-icon :icon="['fas', 'xmark']" class="text-[10px]" />
        Remove
      </button>
    </div>

    <!-- Search -->
    <div class="px-3 py-2 border-b border-gray-100">
      <div class="flex gap-2">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="flex-1 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-yale-300"
          placeholder="Search concepts..."
          @keydown.enter="doSearch"
        />
        <button
          class="px-3 py-1.5 text-sm bg-yale-500 text-white rounded hover:bg-yale-600 disabled:opacity-50"
          :disabled="!searchQuery.trim() || !vocabStore.searchReady"
          @click="doSearch"
        >
          <font-awesome-icon :icon="['fas', 'magnifying-glass']" />
        </button>
      </div>
      <div v-if="!vocabStore.searchReady && vocabStore.indexStatus !== 'idle'" class="text-xs text-yellow-600 mt-1">
        <font-awesome-icon :icon="['fas', 'spinner']" class="animate-spin mr-1" />
        Index not ready. Please wait...
      </div>
    </div>

    <!-- Results -->
    <div class="flex-1 overflow-y-auto min-h-0">
      <div v-if="results.length === 0 && hasSearched" class="p-3 text-sm text-gray-400 text-center">
        No results found
      </div>
      <div v-if="results.length === 0 && !hasSearched" class="p-3 text-sm text-gray-400 text-center">
        Search for a concept to map
      </div>
      <div
        v-for="result in results"
        :key="result.concept_id"
        class="px-3 py-2 border-b border-gray-50 hover:bg-gray-50 flex items-start justify-between gap-2"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-semibold text-gray-700">{{ result.concept_id }}</span>
            <span class="text-[10px] text-gray-400 uppercase bg-gray-100 px-1 rounded">{{ result.vocabulary }}</span>
          </div>
          <div class="text-xs text-gray-600 truncate" :title="result.terms">{{ primaryName(result.terms) }}</div>
        </div>
        <button
          v-if="isSelected(result)"
          class="text-xs px-2 py-1 rounded bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex-shrink-0"
          @click="deselectConcept"
        >
          De-select
        </button>
        <button
          v-else
          class="text-xs px-2 py-1 rounded bg-yale-50 text-yale-600 border border-yale-200 hover:bg-yale-100 flex-shrink-0"
          @click="selectConcept(result)"
        >
          Select
        </button>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalCount > 0" class="flex items-center justify-between px-3 py-1.5 border-t border-gray-100 text-xs text-gray-500">
      <span>{{ totalCount.toLocaleString() }} results</span>
      <div v-if="totalPages > 1" class="flex items-center gap-1">
        <button
          class="px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
          :disabled="currentPage === 0"
          @click="prevPage"
        >
          Prev
        </button>
        <span class="px-2 py-0.5">{{ currentPage + 1 }} / {{ totalPages }}</span>
        <button
          class="px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
          :disabled="currentPage >= totalPages - 1"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import { useVocabularyStore } from '../../../stores/vocabularyStore.js'
import { useFileStore } from '../../../stores/fileStore.js'

const annotationStore = useAnnotationStore()
const vocabStore = useVocabularyStore()
const fileStore = useFileStore()

const panelRef = ref(null)
const searchInputRef = ref(null)
const searchQuery = ref('')
const results = ref([])
const totalCount = ref(0)
const currentPage = ref(0)
const hasSearched = ref(false)
const searching = ref(false)
const pageSize = 20

// Drag state
const dragOffset = ref({ x: 0, y: 0 })
const panelPos = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const hasManualPos = ref(false)

const PANEL_WIDTH = 400
const PANEL_MAX_HEIGHT = 500

const panelStyle = computed(() => {
  let left, top

  if (hasManualPos.value) {
    left = panelPos.value.x
    top = panelPos.value.y
  } else {
    const pos = annotationStore.conceptMappingPosition
    left = pos.x + 10
    top = pos.y

    // Clamp to viewport
    if (left + PANEL_WIDTH > window.innerWidth) {
      left = window.innerWidth - PANEL_WIDTH - 16
    }
    if (top + PANEL_MAX_HEIGHT > window.innerHeight) {
      top = window.innerHeight - PANEL_MAX_HEIGHT - 16
    }
    left = Math.max(16, left)
    top = Math.max(16, top)
  }

  return {
    left: left + 'px',
    top: top + 'px',
    width: PANEL_WIDTH + 'px',
    minHeight: '400px',
    maxHeight: PANEL_MAX_HEIGHT + 'px',
  }
})

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize))

const targetLabel = computed(() => {
  const target = annotationStore.conceptMappingTarget
  if (!target) return ''
  if (target.type === 'entity') {
    const e = target.annotation
    return `${e.semantic} [${e.begin}:${e.end}]`
  } else {
    return `${target.annotation.semantic} (relation)`
  }
})

const targetAnnotatedText = computed(() => {
  const target = annotationStore.conceptMappingTarget
  if (!target || target.type !== 'entity') return ''
  const file = fileStore.activeFile
  if (!file) return ''
  const e = target.annotation
  return file.content?.slice(e.begin, e.end) || ''
})

const currentConcept = computed(() => {
  const target = annotationStore.conceptMappingTarget
  if (!target) return null
  // Read directly from the file to stay reactive
  const file = fileStore.activeFile
  if (!file) return null
  let annotation
  if (target.type === 'entity') {
    annotation = file.indexes[target.offsetKey]?.Entity?.[target.index]
  } else {
    annotation = file.indexes[target.offsetKey]?.Relation?.[target.index]
  }
  if (!annotation?.attrs?.concept?.attrValue) return null
  return {
    concept: annotation.attrs.concept.attrValue,
    vocabulary: annotation.attrs.vocabulary?.attrValue || '',
  }
})

function primaryName(terms) {
  if (!terms) return ''
  return terms.split('|')[0]
}

function isSelected(result) {
  if (!currentConcept.value) return false
  return currentConcept.value.concept === result.concept_id && currentConcept.value.vocabulary === result.vocabulary
}

async function doSearch() {
  const query = searchQuery.value.trim()
  if (!query || !vocabStore.searchReady) return

  searching.value = true
  currentPage.value = 0
  try {
    const res = await vocabStore.search(query, { offset: 0, limit: pageSize })
    results.value = res.results
    totalCount.value = res.totalCount
    hasSearched.value = true
  } finally {
    searching.value = false
  }
}

async function loadPage(page) {
  const query = searchQuery.value.trim()
  if (!query) return

  searching.value = true
  try {
    const res = await vocabStore.search(query, { offset: page * pageSize, limit: pageSize })
    results.value = res.results
    currentPage.value = page
  } finally {
    searching.value = false
  }
}

function prevPage() {
  if (currentPage.value > 0) {
    loadPage(currentPage.value - 1)
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    loadPage(currentPage.value + 1)
  }
}

function selectConcept(result) {
  const target = annotationStore.conceptMappingTarget
  if (!target) return
  annotationStore.setConceptMapping(
    target.offsetKey,
    target.index,
    target.type,
    result.concept_id,
    result.vocabulary,
  )
}

function deselectConcept() {
  const target = annotationStore.conceptMappingTarget
  if (!target) return
  annotationStore.clearConceptMapping(target.offsetKey, target.index, target.type)
}

function clearMapping() {
  deselectConcept()
}

function close() {
  annotationStore.closeConceptMapping()
  resetState()
}

function resetState() {
  searchQuery.value = ''
  results.value = []
  totalCount.value = 0
  currentPage.value = 0
  hasSearched.value = false
  hasManualPos.value = false
}

// Dragging
function startDrag(event) {
  if (!panelRef.value) return
  const rect = panelRef.value.getBoundingClientRect()
  dragOffset.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(event) {
  if (!isDragging.value) return
  panelPos.value = {
    x: event.clientX - dragOffset.value.x,
    y: event.clientY - dragOffset.value.y,
  }
  hasManualPos.value = true
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Click outside
function handleClickOutside(event) {
  if (annotationStore.showConceptMapping && panelRef.value && !panelRef.value.contains(event.target)) {
    close()
  }
}

// Auto-focus search input when panel opens
watch(() => annotationStore.showConceptMapping, (visible) => {
  if (visible) {
    resetState()
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>
