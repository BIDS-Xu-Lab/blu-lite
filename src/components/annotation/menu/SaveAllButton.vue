<template>
  <button
    class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors"
    :class="isDisabled
      ? 'text-gray-300 cursor-not-allowed'
      : 'hover:bg-gray-100 text-gray-700'"
    :disabled="isDisabled"
    title="Save all modified files to disk"
    @click="handleSaveAll"
  >
    <font-awesome-icon :icon="['fas', 'floppy-disk']" class="text-xs" />
    <span>Save All</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useFileStore } from '../../../stores/fileStore.js'

const fileStore = useFileStore()

const isDisabled = computed(() => fileStore.files.length === 0)

async function handleSaveAll() {
  try {
    await fileStore.dumpAllFiles()
  } catch (e) {
    console.error('Failed to save all files:', e)
  }
}
</script>
