<template>
  <div class="flex flex-col h-full border-r border-gray-200 bg-white">
    <!-- Schema name -->
    <div class="px-3 py-2 border-b border-gray-100 bg-gray-50">
      <input
        class="text-sm font-medium text-gray-700 w-full bg-transparent border-b border-transparent focus:outline-none focus:border-yale-300 transition-colors"
        :value="editorStore.schemaName"
        @input="editorStore.setSchemaName($event.target.value)"
        placeholder="Schema name..."
      />
    </div>
    <!-- Type sections -->
    <div class="flex-1 overflow-y-auto">
      <TypeListSection
        type="entity"
        label="Entities"
        icon="cube"
        :items="editorStore.entities"
        @add="editorStore.addEntity()"
      />
      <TypeListSection
        type="relation"
        label="Relations"
        icon="arrows-left-right"
        :items="editorStore.relations"
        @add="editorStore.addRelation()"
      />
    </div>
  </div>
</template>

<script setup>
import { useSchemaEditorStore } from '../../stores/schemaEditorStore.js'
import TypeListSection from './TypeListSection.vue'

const editorStore = useSchemaEditorStore()
</script>
