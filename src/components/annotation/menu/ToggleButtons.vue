<template>
  <div class="flex items-center gap-1">
    <span class="text-sm mr-1">
      Display:
    </span>
    <button
      class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
      :class="uiStore.showAttributes ? 'bg-yale-50 text-yale-500' : 'text-gray-500 hover:bg-gray-100'"
      @click="uiStore.toggleAttributes()"
      v-tooltip.bottom="'Show attributes'"
    >
      <font-awesome-icon :icon="['fas', 'tags']" class="text-[10px]" />
      <span>Attribute</span>
    </button>
    <button
      class="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors"
      :class="uiStore.showAnnotationId ? 'bg-yale-50 text-yale-500' : 'text-gray-500 hover:bg-gray-100'"
      @click="uiStore.toggleAnnotationId()"
      v-tooltip.bottom="'Show annotation IDs'"
    >
      <font-awesome-icon :icon="['fas', 'fingerprint']" class="text-[10px]" />
      <span>Tag ID</span>
    </button>
  </div>
</template>

<script setup>
import { useUiStore } from '../../../stores/uiStore.js'

const uiStore = useUiStore()
</script>
