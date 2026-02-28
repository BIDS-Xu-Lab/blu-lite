<template>
  <button
    class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
    v-tooltip.bottom="'Auto-annotate document'"
    @click="handleAutoAnnotate"
  >
    <font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" class="text-xs text-gray-500" />
    <span>Auto</span>
  </button>
</template>

<script setup>
function handleAutoAnnotate() {
  // TODO: Implement auto-annotation
  alert('Auto-annotation is not yet implemented.')
}
</script>
