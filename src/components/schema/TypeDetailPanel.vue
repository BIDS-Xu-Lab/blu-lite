<template>
  <div class="h-full overflow-y-auto bg-white p-6">
    <!-- Empty state -->
    <div v-if="!editorStore.selectedItem" class="flex items-center justify-center h-full text-gray-400 text-sm">
      <div class="text-center">
        <font-awesome-icon :icon="['fas', 'cube']" class="text-4xl text-gray-200 mb-3" />
        <p>Select an entity or relation type to edit</p>
      </div>
    </div>

    <template v-else>
      <!-- Type header -->
      <div class="mb-6">
        <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {{ editorStore.selectedType === 'entity' ? 'Entity Type' : 'Relation Type' }}
        </span>
        <div class="flex items-center gap-3 mt-1">
          <input
            type="text"
            :value="editorStore.selectedItem.name"
            @input="editorStore.renameType(editorStore.selectedType, editorStore.selectedTypeIndex, $event.target.value)"
            class="text-lg font-semibold border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:border-yale-300 w-64"
          />
          <span
            v-if="editorStore.selectedType === 'entity' && color"
            class="px-3 py-1 rounded text-xs font-semibold"
            :style="{ backgroundColor: color.bg, color: color.text, border: '1px solid ' + color.border }"
          >
            {{ editorStore.selectedItem.name }}
          </span>
        </div>
      </div>

      <!-- Attributes section -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold text-gray-700">Attributes</span>
          <button
            class="text-xs text-yale-500 hover:text-yale-600 flex items-center gap-1"
            @click="editorStore.addAttribute(editorStore.selectedType, editorStore.selectedTypeIndex)"
          >
            <font-awesome-icon :icon="['fas', 'plus']" class="text-[10px]" />
            Add Attribute
          </button>
        </div>

        <!-- Header row -->
        <div
          v-if="attrs.length"
          class="grid grid-cols-[1fr_5.5rem_1fr_7rem_auto] gap-2 px-2 py-1 text-[11px] font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100"
        >
          <span>Name</span>
          <span>Type</span>
          <span>Values</span>
          <span>Default</span>
          <span class="w-[4.5rem]"></span>
        </div>

        <!-- Attribute rows -->
        <AttributeRow
          v-for="(attr, attrIndex) in attrs"
          :key="attrIndex"
          :attr="attr"
          :index="attrIndex"
          :isFirst="attrIndex === 0"
          :isLast="attrIndex === attrs.length - 1"
          @update="(updates) => editorStore.updateAttribute(editorStore.selectedType, editorStore.selectedTypeIndex, attrIndex, updates)"
          @remove="editorStore.removeAttribute(editorStore.selectedType, editorStore.selectedTypeIndex, attrIndex)"
          @move-up="editorStore.moveAttribute(editorStore.selectedType, editorStore.selectedTypeIndex, attrIndex, -1)"
          @move-down="editorStore.moveAttribute(editorStore.selectedType, editorStore.selectedTypeIndex, attrIndex, 1)"
        />

        <div v-if="!attrs.length" class="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded mt-2">
          No attributes defined. Click "Add Attribute" to create one.
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSchemaEditorStore } from '../../stores/schemaEditorStore.js'
import AttributeRow from './AttributeRow.vue'

const editorStore = useSchemaEditorStore()

const attrs = computed(() => editorStore.selectedItem?.attrs ?? [])

const color = computed(() => {
  if (editorStore.selectedType !== 'entity' || !editorStore.selectedItem) return null
  return editorStore.previewColors[editorStore.selectedItem.name] ?? null
})
</script>
