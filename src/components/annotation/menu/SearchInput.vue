<template>
  <div class="flex items-center">
    <span class="relative">
      <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
      <input
        type="text"
        :value="inputValue"
        @input="onInput"
        placeholder="Search..."
        v-tooltip.bottom="'Highlight matching text'"
        class="pl-7 pr-7 py-1 text-sm border border-gray-200 rounded w-44 focus:outline-none focus:border-yale-300 focus:ring-1 focus:ring-yale-200"
      />
      <button
        v-if="inputValue"
        @click="clearSearch"
        v-tooltip.bottom="'Clear search'"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <font-awesome-icon :icon="['fas', 'times']" class="text-xs" />
      </button>
    </span>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useUiStore } from '../../../stores/uiStore.js'

const uiStore = useUiStore()

const inputValue = ref(uiStore.searchQuery)
let debounceTimer = null

function onInput(event) {
  inputValue.value = event.target.value
  clearTimeout(debounceTimer)
  if (!inputValue.value) {
    uiStore.setSearch('')
    return
  }
  debounceTimer = setTimeout(() => {
    uiStore.setSearch(inputValue.value)
  }, 1000)
}

function clearSearch() {
  clearTimeout(debounceTimer)
  inputValue.value = ''
  uiStore.setSearch('')
}

onUnmounted(() => {
  clearTimeout(debounceTimer)
})
</script>
