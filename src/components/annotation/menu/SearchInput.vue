<template>
  <div class="flex items-center">
    <span class="relative">
      <font-awesome-icon :icon="['fas', 'magnifying-glass']" class="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
      <input
        type="text"
        :value="uiStore.searchQuery"
        @input="uiStore.setSearch($event.target.value)"
        placeholder="Search..."
        v-tooltip.bottom="'Highlight matching text'"
        class="pl-7 pr-2 py-1 text-sm border border-gray-200 rounded w-44 focus:outline-none focus:border-yale-300 focus:ring-1 focus:ring-yale-200"
      />
    </span>
  </div>
</template>

<script setup>
import { useUiStore } from '../../../stores/uiStore.js'

const uiStore = useUiStore()
</script>
