<template>
  <button
    class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded transition-colors"
    :class="isDisabled
      ? 'text-gray-300 cursor-not-allowed'
      : 'hover:bg-gray-100 text-gray-700'"
    :disabled="isDisabled"
    v-tooltip.bottom="'Save current file'"
    @click="handleSave"
  >
    <font-awesome-icon :icon="['far', 'floppy-disk']" class="text-xs" />
    <span>Save</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useFileStore } from '../../../stores/fileStore.js'

const fileStore = useFileStore()

const isDisabled = computed(() => !fileStore.activeFile)

async function handleSave() {
  try {
    await fileStore.saveActiveFile()
  } catch (e) {
    console.error('Failed to save file:', e)
  }
}
</script>
