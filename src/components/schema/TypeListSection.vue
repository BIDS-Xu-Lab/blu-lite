<template>
  <div class="border-b border-gray-100">
    <div class="flex items-center justify-between px-3 py-1.5 bg-gray-50">
      <span class="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        <font-awesome-icon :icon="['fas', icon]" class="mr-1" />
        {{ label }} ({{ items.length }})
      </span>
      <button
        class="text-[11px] text-yale-500 hover:text-yale-600 flex items-center gap-1"
        @click="$emit('add')"
      >
        <font-awesome-icon :icon="['fas', 'plus']" class="text-[9px]" />
        Add
      </button>
    </div>
    <TypeListItem
      v-for="(item, index) in items"
      :key="index"
      :item="item"
      :index="index"
      :active="editorStore.selectedType === type && editorStore.selectedTypeIndex === index"
      :color="type === 'entity' ? editorStore.previewColors[item.name] : null"
      :isFirst="index === 0"
      :isLast="index === items.length - 1"
      @select="editorStore.selectItem(type, index)"
      @move-up="editorStore.moveType(type, index, -1)"
      @move-down="editorStore.moveType(type, index, 1)"
      @remove="type === 'entity' ? editorStore.removeEntity(index) : editorStore.removeRelation(index)"
    />
    <div v-if="items.length === 0" class="px-3 py-2 text-xs text-gray-400 italic">
      No {{ label.toLowerCase() }} defined
    </div>
  </div>
</template>

<script setup>
import { useSchemaEditorStore } from '../../stores/schemaEditorStore.js'
import TypeListItem from './TypeListItem.vue'

defineProps({
  type: { type: String, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  items: { type: Array, required: true },
})

defineEmits(['add'])

const editorStore = useSchemaEditorStore()
</script>
