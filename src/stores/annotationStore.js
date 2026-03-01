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

  // Relation mode state
  const relationMode = ref(false)
  const pendingRelation = ref(null) // { relationType, fromEntity, fromOffsetKey }

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

  const allRelations = computed(() => {
    const relations = []
    const indexes = currentIndexes.value
    for (const [offsetKey, indexData] of Object.entries(indexes)) {
      if (indexData.Relation) {
        for (let ri = 0; ri < indexData.Relation.length; ri++) {
          relations.push({ ...indexData.Relation[ri], _offsetKey: offsetKey, _relationIndex: ri })
        }
      }
    }
    return relations
  })

  const relationCount = computed(() => allRelations.value.length)

  // Set of entity keys involved in relations (for styling connected labels)
  const entitiesInRelations = computed(() => {
    const keys = new Set()
    for (const rel of allRelations.value) {
      keys.add(`${rel.fromEnt.begin}-${rel.fromEnt.end}-${rel.fromEnt.semantic}`)
      keys.add(`${rel.toEnt.begin}-${rel.toEnt.end}-${rel.toEnt.semantic}`)
    }
    return keys
  })

  function isEntityInRelation(entity) {
    return entitiesInRelations.value.has(`${entity.begin}-${entity.end}-${entity.semantic}`)
  }

  function startRelationMode(relationType, fromEntity, fromOffsetKey) {
    relationMode.value = true
    pendingRelation.value = { relationType, fromEntity, fromOffsetKey }
  }

  function cancelRelationMode() {
    relationMode.value = false
    pendingRelation.value = null
  }

  function createRelation(toEntity) {
    if (!pendingRelation.value || !fileStore.activeFile) return null
    const { relationType, fromEntity, fromOffsetKey } = pendingRelation.value
    const indexes = fileStore.activeFile.indexes

    if (!indexes[fromOffsetKey]) {
      indexes[fromOffsetKey] = {}
    }
    if (!indexes[fromOffsetKey].Relation) {
      indexes[fromOffsetKey].Relation = []
    }

    const relation = {
      id: generateId(),
      semantic: relationType,
      type: 'Relation',
      begin: fromEntity.begin,
      end: fromEntity.end,
      fromEnt: {
        begin: fromEntity.begin,
        end: fromEntity.end,
        semantic: fromEntity.semantic,
        type: 'Entity',
      },
      toEnt: {
        begin: toEntity.begin,
        end: toEntity.end,
        semantic: toEntity.semantic,
        type: 'Entity',
      },
      attrs: {},
    }

    indexes[fromOffsetKey].Relation.push(relation)
    fileStore.markActiveDirty()

    relationMode.value = false
    pendingRelation.value = null
    return relation
  }

  function deleteRelation(offsetKey, relationIndex) {
    if (!fileStore.activeFile) return
    const indexes = fileStore.activeFile.indexes
    if (!indexes[offsetKey]?.Relation) return

    indexes[offsetKey].Relation.splice(relationIndex, 1)
    if (indexes[offsetKey].Relation.length === 0) {
      delete indexes[offsetKey].Relation
    }
    if (Object.keys(indexes[offsetKey]).length === 0) {
      delete indexes[offsetKey]
    }
    fileStore.markActiveDirty()
  }

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

    const entity = indexes[offsetKey].Entity[entityIndex]

    // Cascade-delete relations referencing this entity
    if (entity) {
      for (const [oKey, indexData] of Object.entries(indexes)) {
        if (!indexData.Relation) continue
        for (let ri = indexData.Relation.length - 1; ri >= 0; ri--) {
          const rel = indexData.Relation[ri]
          const matchesFrom = rel.fromEnt.begin === entity.begin && rel.fromEnt.end === entity.end && rel.fromEnt.semantic === entity.semantic
          const matchesTo = rel.toEnt.begin === entity.begin && rel.toEnt.end === entity.end && rel.toEnt.semantic === entity.semantic
          if (matchesFrom || matchesTo) {
            indexData.Relation.splice(ri, 1)
          }
        }
        if (indexData.Relation.length === 0) {
          delete indexData.Relation
        }
        if (Object.keys(indexData).length === 0) {
          delete indexes[oKey]
        }
      }
    }

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
    relationMode,
    pendingRelation,
    currentIndexes,
    allEntities,
    allRelations,
    entityCount,
    relationCount,
    entitiesInRelations,
    isEntityInRelation,
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
    startRelationMode,
    cancelRelationMode,
    createRelation,
    deleteRelation,
  }
})
