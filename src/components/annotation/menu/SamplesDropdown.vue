<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      v-tooltip.bottom="'Load sample data'"
      @click="toggle"
    >
      <font-awesome-icon :icon="['fas', 'flask']" class="text-xs text-gray-500" />
      <span>Samples</span>
      <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-[10px] text-gray-400" />
    </button>
    <TieredMenu ref="menu" :model="items" :popup="true" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TieredMenu from 'primevue/tieredmenu'
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useFileStore } from '../../../stores/fileStore.js'
import basicSchema from '../../../samples/basic/schema.json'
import basicSampleNote from '../../../samples/basic/sample_note.json'

const schemaStore = useSchemaStore()
const fileStore = useFileStore()
const menu = ref()

const items = ref([
  {
    label: 'Basic (Disease & Drug)',
    icon: 'pi pi-database',
    command: () => {
      schemaStore.loadSchema(structuredClone(basicSchema))
      fileStore.files = [{ ...structuredClone(basicSampleNote), _dirty: false }]
      fileStore.activeFileIndex = 0
    },
  },
])

function toggle(event) {
  menu.value.toggle(event)
}
</script>
