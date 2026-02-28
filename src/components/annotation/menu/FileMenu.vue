<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      title="Load, save, and export annotation files"
      @click="toggle"
    >
      <font-awesome-icon :icon="['fas', 'file']" class="text-xs text-gray-500" />
      <span>File</span>
      <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-[10px] text-gray-400" />
    </button>
    <TieredMenu ref="menu" :model="items" :popup="true" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TieredMenu from 'primevue/tieredmenu'
import { useFileStore } from '../../../stores/fileStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'

const fileStore = useFileStore()
const schemaStore = useSchemaStore()
const menu = ref()

const items = ref([
  {
    label: 'Load File(s)',
    icon: 'pi pi-folder-open',
    command: async () => {
      if (!schemaStore.isLoaded) {
        alert('Please load an annotation schema first.')
        return
      }
      try {
        await fileStore.loadDirectory()
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('Failed to load directory:', e)
        }
      }
    },
  },
  {
    label: 'Dump Files',
    icon: 'pi pi-save',
    command: async () => {
      try {
        await fileStore.dumpAllFiles()
      } catch (e) {
        console.error('Failed to dump files:', e)
      }
    },
  },
  {
    separator: true,
  },
  {
    label: 'Export',
    icon: 'pi pi-download',
    command: () => {
      // TODO: export functionality
    },
  },
])

function toggle(event) {
  menu.value.toggle(event)
}
</script>
