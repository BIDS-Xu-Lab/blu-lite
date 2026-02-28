<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      v-tooltip.bottom="'Help & documentation'"
      @click="toggle"
    >
      <font-awesome-icon :icon="['fas', 'circle-question']" class="text-xs text-gray-500" />
      <span>Help</span>
      <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-[10px] text-gray-400" />
    </button>
    <TieredMenu ref="menu" :model="items" :popup="true" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TieredMenu from 'primevue/tieredmenu'

const menu = ref()

const items = ref([
  {
    label: 'Quick Tour',
    icon: 'pi pi-play-circle',
    command: () => {
      alert('Quick Tour coming soon.')
    },
  },
  {
    label: 'Tutorial',
    icon: 'pi pi-book',
    command: () => {
      alert('Tutorial coming soon.')
    },
  },
  {
    separator: true,
  },
  {
    label: 'Wiki',
    icon: 'pi pi-external-link',
    command: () => {
      alert('Wiki coming soon.')
    },
  },
])

function toggle(event) {
  menu.value.toggle(event)
}
</script>
