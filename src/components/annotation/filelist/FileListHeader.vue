<template>
  <div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
    <span class="text-xs font-medium text-gray-600">
      {{ fileStore.totalFiles }} file{{ fileStore.totalFiles !== 1 ? 's' : '' }}
    </span>
    <div class="flex items-center gap-1.5">
      <button
        class="flex items-center justify-center w-5 h-5 rounded transition-colors"
        :class="fileStore.totalFiles === 0
          ? 'text-gray-300 cursor-not-allowed'
          : 'text-gray-400 hover:text-red-500 hover:bg-red-50'"
        :disabled="fileStore.totalFiles === 0"
        v-tooltip.bottom="'Remove all files'"
        @click="handleClearAll"
      >
        <font-awesome-icon :icon="['fas', 'trash-can']" class="text-[10px]" />
      </button>
      <select
        class="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 focus:outline-none focus:border-yale-300"
        :value="sortValue"
        @change="onSortChange"
      >
        <option value="filename-asc">Name A-Z</option>
        <option value="filename-desc">Name Z-A</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFileStore } from '../../../stores/fileStore.js'

const fileStore = useFileStore()

const sortValue = computed(() => `${fileStore.sortField}-${fileStore.sortOrder}`)

function onSortChange(event) {
  const [field, order] = event.target.value.split('-')
  fileStore.setSorting(field, order)
}

function handleClearAll() {
  fileStore.clearAllFiles()
}
</script>
