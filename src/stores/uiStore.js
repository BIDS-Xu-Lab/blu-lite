import { ref } from 'vue'
import { defineStore } from 'pinia'
import { PAGE_SIZE } from '../utils/constants.js'

export const useUiStore = defineStore('ui', () => {
  const showAttributes = ref(true)
  const showAnnotationId = ref(false)
  const showGuideline = ref(false)
  const searchQuery = ref('')
  const currentPage = ref(0)
  const pageSize = ref(PAGE_SIZE)
  const hoveredEntityId = ref(null)
  const hoveredEntityKeys = ref([])

  function toggleAttributes() {
    showAttributes.value = !showAttributes.value
  }

  function toggleAnnotationId() {
    showAnnotationId.value = !showAnnotationId.value
  }

  function toggleGuideline() {
    showGuideline.value = !showGuideline.value
  }

  function setSearch(q) {
    searchQuery.value = q
  }

  function setPage(page) {
    currentPage.value = page
  }

  function setHoveredEntityId(id) {
    hoveredEntityId.value = id
  }

  function setHoveredEntityKeys(keys) {
    hoveredEntityKeys.value = Array.isArray(keys) ? keys : []
  }

  return {
    showAttributes,
    showAnnotationId,
    showGuideline,
    searchQuery,
    currentPage,
    pageSize,
    hoveredEntityId,
    hoveredEntityKeys,
    toggleAttributes,
    toggleAnnotationId,
    toggleGuideline,
    setSearch,
    setPage,
    setHoveredEntityId,
    setHoveredEntityKeys,
  }
})
