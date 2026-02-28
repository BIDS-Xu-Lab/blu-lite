import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { generateEntityColors } from '../utils/colors.js'

export const useSchemaStore = defineStore('schema', () => {
  const schema = ref(null)
  const isLoaded = ref(false)
  const entityColorMap = ref({})

  const schemaName = computed(() => schema.value?.name ?? '')
  const entityTypes = computed(() => schema.value?.entity ?? [])
  const relationTypes = computed(() => schema.value?.relation ?? [])
  const entityNames = computed(() => entityTypes.value.map((e) => e.name))

  function getEntityAttrs(entityName) {
    return entityTypes.value.find((e) => e.name === entityName)?.attrs ?? []
  }

  function getEntityColor(entityName) {
    return entityColorMap.value[entityName] ?? { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
  }

  function loadSchema(jsonObj) {
    schema.value = jsonObj
    isLoaded.value = true
    entityColorMap.value = generateEntityColors(jsonObj.entity.map((e) => e.name))
  }

  function clearSchema() {
    schema.value = null
    isLoaded.value = false
    entityColorMap.value = {}
  }

  return {
    schema,
    isLoaded,
    entityColorMap,
    schemaName,
    entityTypes,
    relationTypes,
    entityNames,
    getEntityAttrs,
    getEntityColor,
    loadSchema,
    clearSchema,
  }
})
