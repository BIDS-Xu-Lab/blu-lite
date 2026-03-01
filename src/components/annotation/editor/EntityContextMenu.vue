<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
  >
    <!-- Relation menu items -->
    <template v-if="availableRelations.length > 0">
      <button
        v-for="rel in availableRelations"
        :key="rel.name"
        class="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 text-blue-700 flex items-center gap-2"
        @click="startRelation(rel)"
      >
        <font-awesome-icon :icon="['fas', 'arrow-right-long']" class="text-xs text-blue-400" />
        Add {{ rel.name }}
      </button>
      <div class="border-t border-gray-100 my-0.5"></div>
    </template>

    <button
      class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
      @click="editAttribute"
    >
      <font-awesome-icon :icon="['fas', 'pen-to-square']" class="text-xs text-gray-400" />
      Edit Attributes
    </button>
    <div class="border-t border-gray-100 my-0.5"></div>
    <button
      class="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
      @click="deleteEntity"
    >
      <font-awesome-icon :icon="['fas', 'trash']" class="text-xs" />
      Delete
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'

const annotationStore = useAnnotationStore()
const schemaStore = useSchemaStore()

const visible = ref(false)
const position = ref({ x: 0, y: 0 })
const menuRef = ref(null)

const availableRelations = computed(() => {
  if (!annotationStore.editingEntity) return []
  return schemaStore.getRelationsForEntity(annotationStore.editingEntity.semantic)
})

function handleEntityClick(event) {
  if (annotationStore.relationMode) return
  const { x, y } = event.detail
  position.value = { x, y }
  visible.value = true
}

function handleClickOutside(event) {
  if (visible.value && menuRef.value && !menuRef.value.contains(event.target)) {
    visible.value = false
  }
}

function startRelation(rel) {
  visible.value = false
  const entity = annotationStore.editingEntity
  const offsetKey = annotationStore.editingOffset
  if (entity && offsetKey) {
    annotationStore.startRelationMode(rel.name, entity, offsetKey)
  }
}

function editAttribute() {
  visible.value = false
  window.dispatchEvent(new CustomEvent('open-attribute-editor'))
}

function deleteEntity() {
  visible.value = false
  if (annotationStore.editingOffset !== null && annotationStore.editingEntityIndex >= 0) {
    annotationStore.deleteAnnotation(annotationStore.editingOffset, annotationStore.editingEntityIndex)
    annotationStore.clearEditingEntity()
  }
}

onMounted(() => {
  document.addEventListener('entity-click', handleEntityClick)
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('entity-click', handleEntityClick)
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
