<template>
  <button
    class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors"
    :class="candidateStore.isActive
      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
      : 'hover:bg-gray-100'"
    v-tooltip.bottom="'Auto-annotate document'"
    @click="handleAutoAnnotate"
  >
    <font-awesome-icon
      :icon="['fas', 'wand-magic-sparkles']"
      class="text-xs"
      :class="candidateStore.isActive ? 'text-amber-500' : 'text-gray-500'"
    />
    <span>Automate</span>
    <span
      v-if="candidateStore.isActive && candidateStore.candidateCount > 0"
      class="bg-amber-200 text-amber-800 text-[0.6rem] font-bold px-1.5 rounded-full"
    >
      {{ candidateStore.candidateCount }}
    </span>
  </button>

  <Popover ref="popoverRef">
    <div class="p-3 min-w-[240px]">
      <div class="text-sm font-medium text-gray-700 mb-2">
        Auto-Annotation
      </div>
      <div v-if="candidateStore.candidateCount > 0" class="space-y-3">
        <p class="text-sm text-gray-500">
          Found <strong class="text-gray-700">{{ candidateStore.candidateCount }}</strong>
          candidate{{ candidateStore.candidateCount !== 1 ? 's' : '' }}
          in this document.
        </p>
        <p class="text-xs text-gray-400">
          Click a candidate label in the text to accept individually.
        </p>
        <button
          class="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-yale-600 rounded hover:bg-yale-700 transition-colors"
          @click="acceptAll"
        >
          <font-awesome-icon :icon="['fas', 'check-double']" class="text-xs" />
          Accept All ({{ candidateStore.candidateCount }})
        </button>
        <button
          class="w-full flex items-center justify-center gap-2 px-3 py-1 text-xs text-gray-400 rounded hover:bg-gray-50 transition-colors"
          @click="dismiss"
        >
          Dismiss Candidates
        </button>
      </div>
      <div v-else class="text-sm text-gray-400">
        No candidates found. All dictionary entries are already annotated in this document.
      </div>
    </div>
  </Popover>
</template>

<script setup>
import { ref } from 'vue'
import Popover from 'primevue/popover'
import { useCandidateStore } from '../../../stores/candidateStore.js'
import { useFileStore } from '../../../stores/fileStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'

const candidateStore = useCandidateStore()
const fileStore = useFileStore()
const schemaStore = useSchemaStore()
const popoverRef = ref(null)

function handleAutoAnnotate(event) {
  if (!fileStore.activeFile) return
  if (!schemaStore.isLoaded) return

  if (!candidateStore.isActive) {
    candidateStore.findCandidates()
  }

  popoverRef.value.toggle(event)
}

function acceptAll() {
  candidateStore.acceptAllCandidates()
  popoverRef.value.hide()
}

function dismiss() {
  candidateStore.clearCandidates()
  popoverRef.value.hide()
}
</script>
