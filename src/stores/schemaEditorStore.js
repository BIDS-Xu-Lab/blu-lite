import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { generateEntityColors } from '../utils/colors.js'

export const useSchemaEditorStore = defineStore('schemaEditor', () => {
  const draft = ref(null)
  const isDirty = ref(false)

  // Selection state for master-detail
  const selectedType = ref(null) // 'entity' or 'relation'
  const selectedTypeIndex = ref(-1)

  // Computed
  const schemaName = computed(() => draft.value?.name ?? '')
  const entities = computed(() => draft.value?.entity ?? [])
  const relations = computed(() => draft.value?.relation ?? [])

  const previewColors = computed(() => {
    if (!draft.value?.entity) return {}
    return generateEntityColors(draft.value.entity.map(e => e.name))
  })

  const selectedItem = computed(() => {
    if (!selectedType.value || selectedTypeIndex.value < 0) return null
    const arr = selectedType.value === 'entity' ? entities.value : relations.value
    return arr[selectedTypeIndex.value] ?? null
  })

  const validationErrors = computed(() => {
    if (!draft.value) return ['No schema loaded']
    const errors = []
    if (!draft.value.name?.trim()) errors.push('Schema name is required')

    if (!Array.isArray(draft.value.entity)) {
      errors.push('"entity" must be an array')
    } else {
      const entityNames = new Set()
      draft.value.entity.forEach((e, i) => {
        if (!e.name?.trim()) errors.push(`Entity #${i + 1} has no name`)
        else if (entityNames.has(e.name)) errors.push(`Duplicate entity name: "${e.name}"`)
        else entityNames.add(e.name)

        if (e.attrs && Array.isArray(e.attrs)) {
          const attrNames = new Set()
          e.attrs.forEach((a, j) => {
            if (!a.name?.trim()) errors.push(`Entity "${e.name}" attr #${j + 1} has no name`)
            else if (attrNames.has(a.name)) errors.push(`Entity "${e.name}" duplicate attr: "${a.name}"`)
            else attrNames.add(a.name)

            if (a.value_type === 'enum' && (!Array.isArray(a.values) || a.values.length === 0)) {
              errors.push(`Entity "${e.name}" attr "${a.name}" is enum but has no values`)
            }
          })
        }
      })
    }

    if (!Array.isArray(draft.value.relation)) {
      errors.push('"relation" must be an array')
    } else {
      const relationNames = new Set()
      draft.value.relation.forEach((r, i) => {
        if (!r.name?.trim()) errors.push(`Relation #${i + 1} has no name`)
        else if (relationNames.has(r.name)) errors.push(`Duplicate relation name: "${r.name}"`)
        else relationNames.add(r.name)
      })
    }

    return errors
  })

  const isValid = computed(() => validationErrors.value.length === 0)

  // --- Lifecycle ---
  function createNew() {
    draft.value = { name: 'New Schema', entity: [], relation: [] }
    isDirty.value = false
    selectedType.value = null
    selectedTypeIndex.value = -1
  }

  function loadFromObject(schemaObj) {
    draft.value = JSON.parse(JSON.stringify(schemaObj))
    isDirty.value = false
    selectedType.value = null
    selectedTypeIndex.value = -1
  }

  function reset() {
    draft.value = null
    isDirty.value = false
    selectedType.value = null
    selectedTypeIndex.value = -1
  }

  // --- Schema Name ---
  function setSchemaName(name) {
    if (!draft.value) return
    draft.value.name = name
    isDirty.value = true
  }

  // --- Selection ---
  function selectItem(type, index) {
    selectedType.value = type
    selectedTypeIndex.value = index
  }

  // --- Entity/Relation CRUD ---
  function ensureUniqueName(baseName, items) {
    const names = new Set(items.map(i => i.name))
    if (!names.has(baseName)) return baseName
    let counter = 1
    while (names.has(`${baseName}_${counter}`)) counter++
    return `${baseName}_${counter}`
  }

  function addEntity(name = 'new_entity') {
    if (!draft.value) return
    const uniqueName = ensureUniqueName(name, entities.value)
    draft.value.entity.push({ name: uniqueName, attrs: [] })
    isDirty.value = true
    selectItem('entity', draft.value.entity.length - 1)
  }

  function addRelation(name = 'new_relation') {
    if (!draft.value) return
    const uniqueName = ensureUniqueName(name, relations.value)
    draft.value.relation.push({ name: uniqueName, attrs: [] })
    isDirty.value = true
    selectItem('relation', draft.value.relation.length - 1)
  }

  function removeEntity(index) {
    if (!draft.value || index < 0 || index >= draft.value.entity.length) return
    draft.value.entity.splice(index, 1)
    isDirty.value = true
    if (selectedType.value === 'entity') {
      if (selectedTypeIndex.value === index) {
        selectedTypeIndex.value = draft.value.entity.length > 0
          ? Math.min(index, draft.value.entity.length - 1)
          : -1
        if (selectedTypeIndex.value === -1) selectedType.value = null
      } else if (selectedTypeIndex.value > index) {
        selectedTypeIndex.value--
      }
    }
  }

  function removeRelation(index) {
    if (!draft.value || index < 0 || index >= draft.value.relation.length) return
    draft.value.relation.splice(index, 1)
    isDirty.value = true
    if (selectedType.value === 'relation') {
      if (selectedTypeIndex.value === index) {
        selectedTypeIndex.value = draft.value.relation.length > 0
          ? Math.min(index, draft.value.relation.length - 1)
          : -1
        if (selectedTypeIndex.value === -1) selectedType.value = null
      } else if (selectedTypeIndex.value > index) {
        selectedTypeIndex.value--
      }
    }
  }

  function renameType(type, index, newName) {
    if (!draft.value) return
    const arr = type === 'entity' ? draft.value.entity : draft.value.relation
    if (index < 0 || index >= arr.length) return
    arr[index].name = newName
    isDirty.value = true
  }

  function moveType(type, index, direction) {
    if (!draft.value) return
    const arr = type === 'entity' ? draft.value.entity : draft.value.relation
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= arr.length) return
    ;[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]]
    if (selectedType.value === type && selectedTypeIndex.value === index) {
      selectedTypeIndex.value = newIndex
    }
    isDirty.value = true
  }

  // --- Attribute CRUD ---
  function addAttribute(type, typeIndex) {
    if (!draft.value) return
    const arr = type === 'entity' ? draft.value.entity : draft.value.relation
    if (typeIndex < 0 || typeIndex >= arr.length) return
    const item = arr[typeIndex]
    if (!item.attrs) item.attrs = []
    item.attrs.push({ name: 'new_attr', value_type: 'text', values: [], default_value: '' })
    isDirty.value = true
  }

  function removeAttribute(type, typeIndex, attrIndex) {
    if (!draft.value) return
    const arr = type === 'entity' ? draft.value.entity : draft.value.relation
    if (typeIndex < 0 || typeIndex >= arr.length) return
    const item = arr[typeIndex]
    if (!item.attrs || attrIndex < 0 || attrIndex >= item.attrs.length) return
    item.attrs.splice(attrIndex, 1)
    isDirty.value = true
  }

  function updateAttribute(type, typeIndex, attrIndex, updates) {
    if (!draft.value) return
    const arr = type === 'entity' ? draft.value.entity : draft.value.relation
    if (typeIndex < 0 || typeIndex >= arr.length) return
    const item = arr[typeIndex]
    if (!item.attrs || attrIndex < 0 || attrIndex >= item.attrs.length) return
    Object.assign(item.attrs[attrIndex], updates)
    isDirty.value = true
  }

  function moveAttribute(type, typeIndex, attrIndex, direction) {
    if (!draft.value) return
    const arr = type === 'entity' ? draft.value.entity : draft.value.relation
    if (typeIndex < 0 || typeIndex >= arr.length) return
    const attrs = arr[typeIndex].attrs
    if (!attrs) return
    const newIndex = attrIndex + direction
    if (newIndex < 0 || newIndex >= attrs.length) return
    ;[attrs[attrIndex], attrs[newIndex]] = [attrs[newIndex], attrs[attrIndex]]
    isDirty.value = true
  }

  return {
    draft, isDirty, selectedType, selectedTypeIndex,
    schemaName, entities, relations, previewColors,
    selectedItem, validationErrors, isValid,
    createNew, loadFromObject, reset, setSchemaName,
    selectItem,
    addEntity, addRelation, removeEntity, removeRelation,
    renameType, moveType,
    addAttribute, removeAttribute, updateAttribute, moveAttribute,
  }
})
