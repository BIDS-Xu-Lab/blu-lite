import { ref } from 'vue'
import { defineStore } from 'pinia'
import { PAGE_SIZE } from '../utils/constants.js'

export const useUiStore = defineStore('ui', () => {
  const showAttributes = ref(true)
  const showAnnotationId = ref(false)
  const searchQuery = ref('')
  const currentPage = ref(0)
  const pageSize = ref(PAGE_SIZE)
  const hoveredEntityId = ref(null)

  function toggleAttributes() {
    showAttributes.value = !showAttributes.value
  }

  function toggleAnnotationId() {
    showAnnotationId.value = !showAnnotationId.value
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

  return {
    showAttributes,
    showAnnotationId,
    searchQuery,
    currentPage,
    pageSize,
    hoveredEntityId,
    toggleAttributes,
    toggleAnnotationId,
    setSearch,
    setPage,
    setHoveredEntityId,
  }
})
