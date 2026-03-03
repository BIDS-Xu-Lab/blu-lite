<template>
  <div
    v-if="visible"
    ref="menuRef"
    class="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
    :style="{ left: popupPosition.left + 'px', top: popupPosition.top + 'px' }"
  >
    <!-- Relation menu items -->
    <template v-if="availableRelations.length > 0">
      <button
        v-for="(rel, relIndex) in availableRelations"
        :key="`${rel.name}-${rel.from_entity}-${rel.to_entity}-${relIndex}`"
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
      @click="openConceptMapping"
    >
      <font-awesome-icon :icon="['fas', 'book-medical']" class="text-xs text-gray-400" />
      <template v-if="currentConcept">
        Edit {{ currentConcept }}
      </template>
      <template v-else>
        Concept Mapping
      </template>
    </button>
    <div class="border-t border-gray-100 my-0.5"></div>
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'

const annotationStore = useAnnotationStore()
const schemaStore = useSchemaStore()

const visible = ref(false)
const anchorPosition = ref({ x: 0, y: 0 })
const popupPosition = ref({ left: 0, top: 0 })
const menuRef = ref(null)
const VIEWPORT_PADDING = 8

const availableRelations = computed(() => {
  if (!annotationStore.editingEntity) return []
  return schemaStore.getRelationsForEntity(annotationStore.editingEntity.semantic)
})

const currentConcept = computed(() => {
  const entity = annotationStore.editingEntity
  if (!entity?.attrs?.concept?.attrValue) return null
  const conceptId = entity.attrs.concept.attrValue
  const vocab = entity.attrs.vocabulary?.attrValue || ''
  return `${conceptId}(${vocab})`
})

function openConceptMapping() {
  visible.value = false
  if (annotationStore.editingOffset !== null && annotationStore.editingEntityIndex >= 0) {
    annotationStore.openConceptMapping(
      'entity',
      annotationStore.editingOffset,
      annotationStore.editingEntityIndex,
      { x: popupPosition.value.left, y: popupPosition.value.top },
    )
  }
}

function updatePopupPosition() {
  if (!visible.value) return

  const popupWidth = menuRef.value?.offsetWidth ?? 220
  const popupHeight = menuRef.value?.offsetHeight ?? 220
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = anchorPosition.value.x
  let top = anchorPosition.value.y

  if (left + popupWidth + VIEWPORT_PADDING > viewportWidth) {
    left = viewportWidth - popupWidth - VIEWPORT_PADDING
  }
  if (left < VIEWPORT_PADDING) {
    left = VIEWPORT_PADDING
  }

  if (top + popupHeight + VIEWPORT_PADDING > viewportHeight) {
    top = anchorPosition.value.y - popupHeight
  }
  if (top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING
  }

  popupPosition.value = { left, top }
}

async function handleEntityClick(event) {
  if (annotationStore.relationMode) return
  const { x, y } = event.detail
  anchorPosition.value = { x, y }
  visible.value = true
  await nextTick()
  updatePopupPosition()
}

function handleClickOutside(event) {
  if (visible.value && menuRef.value && !menuRef.value.contains(event.target)) {
    visible.value = false
  }
}

function handleViewportChange() {
  updatePopupPosition()
}

function startRelation(rel) {
  visible.value = false
  const entity = annotationStore.editingEntity
  const offsetKey = annotationStore.editingOffset
  if (entity && offsetKey) {
    annotationStore.startRelationMode(rel.name, rel.to_entity, entity, offsetKey)
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
  window.addEventListener('resize', handleViewportChange)
})

onUnmounted(() => {
  document.removeEventListener('entity-click', handleEntityClick)
  document.removeEventListener('mousedown', handleClickOutside)
  window.removeEventListener('resize', handleViewportChange)
})
</script>
