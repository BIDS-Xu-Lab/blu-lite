import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useFileStore } from './fileStore.js'

let entityIdCounter = Date.now()

function generateId() {
  return String(++entityIdCounter)
}

export const useAnnotationStore = defineStore('annotation', () => {
  const fileStore = useFileStore()

  const pendingSelection = ref(null)
  const showTypeSelector = ref(false)
  const typeSelectorPosition = ref({ x: 0, y: 0 })
  const editingEntity = ref(null)
  const editingOffset = ref(null)
  const editingEntityIndex = ref(-1)

  const currentIndexes = computed(() => {
    return fileStore.activeFile?.indexes ?? {}
  })

  const allEntities = computed(() => {
    const entities = []
    const indexes = currentIndexes.value
    for (const [offsetKey, indexData] of Object.entries(indexes)) {
      if (indexData.Entity) {
        for (const entity of indexData.Entity) {
          entities.push({ ...entity, _offsetKey: offsetKey })
        }
      }
    }
    return entities
  })

  const entityCount = computed(() => allEntities.value.length)

  const charCount = computed(() => fileStore.activeFile?.content?.length ?? 0)

  const tokenCount = computed(() => {
    const content = fileStore.activeFile?.content
    if (!content) return 0
    return content.split(/\s+/).filter(Boolean).length
  })

  function setPendingSelection(sel) {
    pendingSelection.value = sel
  }

  function clearPendingSelection() {
    pendingSelection.value = null
  }

  function createAnnotation(entityType, schemaAttrs = []) {
    if (!pendingSelection.value || !fileStore.activeFile) return null

    const { start, end } = pendingSelection.value
    const offsetKey = String(start)
    const indexes = fileStore.activeFile.indexes

    if (!indexes[offsetKey]) {
      indexes[offsetKey] = {}
    }
    if (!indexes[offsetKey].Entity) {
      indexes[offsetKey].Entity = []
    }

    const attrs = {}
    for (const attr of schemaAttrs) {
      attrs[attr.name] = {
        id: generateId(),
        attrKey: attr.name,
        attrValue: attr.default_value ?? '',
        attrType: attr.value_type ?? 'text',
        annotationValue: '',
        attrIcon: '',
      }
    }

    const entity = {
      id: generateId(),
      semantic: entityType,
      begin: start,
      end: end,
      type: 'Entity',
      attrs,
    }

    indexes[offsetKey].Entity.push(entity)
    fileStore.markActiveDirty()
    pendingSelection.value = null

    return entity
  }

  function deleteAnnotation(offsetKey, entityIndex) {
    if (!fileStore.activeFile) return
    const indexes = fileStore.activeFile.indexes
    if (!indexes[offsetKey]?.Entity) return

    indexes[offsetKey].Entity.splice(entityIndex, 1)
    if (indexes[offsetKey].Entity.length === 0) {
      delete indexes[offsetKey].Entity
    }
    if (Object.keys(indexes[offsetKey]).length === 0) {
      delete indexes[offsetKey]
    }
    fileStore.markActiveDirty()
  }

  function setEditingEntity(offsetKey, entityIndex) {
    if (!fileStore.activeFile) return
    const entity = fileStore.activeFile.indexes[offsetKey]?.Entity?.[entityIndex]
    if (entity) {
      editingEntity.value = entity
      editingOffset.value = offsetKey
      editingEntityIndex.value = entityIndex
    }
  }

  function clearEditingEntity() {
    editingEntity.value = null
    editingOffset.value = null
    editingEntityIndex.value = -1
  }

  function updateEntityAttribute(offsetKey, entityIndex, attrName, attrValue) {
    if (!fileStore.activeFile) return
    const entity = fileStore.activeFile.indexes[offsetKey]?.Entity?.[entityIndex]
    if (!entity) return

    if (!entity.attrs) {
      entity.attrs = {}
    }

    if (entity.attrs[attrName]) {
      entity.attrs[attrName].attrValue = attrValue
    } else {
      entity.attrs[attrName] = {
        id: generateId(),
        attrKey: attrName,
        attrValue: attrValue,
        attrType: 'text',
        annotationValue: '',
        attrIcon: '',
      }
    }
    fileStore.markActiveDirty()
  }

  function removeEntityAttribute(offsetKey, entityIndex, attrName) {
    if (!fileStore.activeFile) return
    const entity = fileStore.activeFile.indexes[offsetKey]?.Entity?.[entityIndex]
    if (!entity?.attrs?.[attrName]) return
    delete entity.attrs[attrName]
    fileStore.markActiveDirty()
  }

  return {
    pendingSelection,
    showTypeSelector,
    typeSelectorPosition,
    editingEntity,
    editingOffset,
    editingEntityIndex,
    currentIndexes,
    allEntities,
    entityCount,
    charCount,
    tokenCount,
    setPendingSelection,
    clearPendingSelection,
    createAnnotation,
    deleteAnnotation,
    setEditingEntity,
    clearEditingEntity,
    updateEntityAttribute,
    removeEntityAttribute,
  }
})
