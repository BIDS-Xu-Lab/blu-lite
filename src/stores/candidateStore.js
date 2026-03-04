import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useFileStore } from './fileStore.js'
import { useSchemaStore } from './schemaStore.js'
import { generateId } from '../utils/idGenerator.js'

export const useCandidateStore = defineStore('candidate', () => {
  const fileStore = useFileStore()
  const schemaStore = useSchemaStore()

  const candidates = ref([])
  const isActive = ref(false)

  const candidateCount = computed(() => candidates.value.length)

  const dictionaryMap = ref(new Map())

  const TOKEN_CHAR_REGEX = /[\p{L}\p{N}_]/u

  function isTokenChar(char) {
    if (!char) return false
    return TOKEN_CHAR_REGEX.test(char)
  }

  function isTokenBoundaryMatch(content, begin, end, text) {
    const firstChar = text[0]
    const lastChar = text[text.length - 1]
    const requiresLeftBoundary = isTokenChar(firstChar)
    const requiresRightBoundary = isTokenChar(lastChar)

    if (requiresLeftBoundary && begin > 0) {
      const leftChar = content[begin - 1]
      if (isTokenChar(leftChar)) return false
    }

    if (requiresRightBoundary && end < content.length) {
      const rightChar = content[end]
      if (isTokenChar(rightChar)) return false
    }

    return true
  }

  // Build a dictionary of unique annotations from all loaded files
  function buildDictionary() {
    const textMap = new Map() // surfaceText -> Map<semantic, { attrs, count }>

    for (const file of fileStore.files) {
      if (!file.content || !file.indexes) continue
      for (const [, indexData] of Object.entries(file.indexes)) {
        if (!indexData.Entity) continue
        for (const entity of indexData.Entity) {
          const surfaceText = file.content.slice(entity.begin, entity.end)
          if (!surfaceText.trim()) continue

          if (!textMap.has(surfaceText)) {
            textMap.set(surfaceText, new Map())
          }
          const semanticMap = textMap.get(surfaceText)
          const existing = semanticMap.get(entity.semantic)
          if (existing) {
            existing.count++
          } else {
            semanticMap.set(entity.semantic, {
              attrs: entity.attrs ? JSON.parse(JSON.stringify(entity.attrs)) : {},
              count: 1,
            })
          }
        }
      }
    }

    // Resolve to most common semantic per text
    for (const [text, semanticMap] of textMap) {
      let best = null
      let bestCount = 0
      for (const [semantic, data] of semanticMap) {
        if (data.count > bestCount) {
          best = { semantic, attrs: data.attrs }
          bestCount = data.count
        }
      }
      if (best) dictionaryMap.value.set(text, best)
    }
  }

  function updateDictionary(text, semantic, attrs) {
    if (!dictionaryMap.value.has(text)) {
      dictionaryMap.value.set(text, { semantic, attrs })
    }
  }

  // Find candidates in the current document
  function findCandidates() {
    const file = fileStore.activeFile
    if (!file?.content) {
      candidates.value = []
      return
    }

    buildDictionary()

    const content = file.content

    // Collect existing entity ranges
    const existingRanges = []
    for (const [, indexData] of Object.entries(file.indexes || {})) {
      if (!indexData.Entity) continue
      for (const entity of indexData.Entity) {
        existingRanges.push([entity.begin, entity.end])
      }
    }

    // Sort dictionary entries by text length descending (longer matches first)
    const entries = [...dictionaryMap.value.entries()].sort((a, b) => b[0].length - a[0].length)

    const found = []
    const occupiedRanges = [...existingRanges]

    for (const [text, { semantic, attrs }] of entries) {
      let searchFrom = 0
      while (searchFrom <= content.length - text.length) {
        const idx = content.indexOf(text, searchFrom)
        if (idx === -1) break

        const begin = idx
        const end = idx + text.length

        if (!isTokenBoundaryMatch(content, begin, end, text)) {
          searchFrom = idx + 1
          continue
        }

        // Check overlap with existing annotations and already-found candidates
        const overlaps = occupiedRanges.some(
          ([rb, re]) => begin < re && end > rb,
        )

        if (!overlaps) {
          found.push({
            id: `candidate-${begin}-${end}`,
            text,
            begin,
            end,
            semantic,
            attrs: JSON.parse(JSON.stringify(attrs)),
          })
          occupiedRanges.push([begin, end])
        }

        searchFrom = idx + 1
      }
    }

    candidates.value = found.sort((a, b) => a.begin - b.begin)
    isActive.value = true
  }

  // Convert a single candidate to a real annotation
  function acceptCandidate(candidateId) {
    const idx = candidates.value.findIndex((c) => c.id === candidateId)
    if (idx === -1) return

    const candidate = candidates.value[idx]
    createAnnotationFromCandidate(candidate)
    candidates.value.splice(idx, 1)

    if (candidates.value.length === 0) {
      isActive.value = false
    }
  }

  // Convert all candidates to real annotations
  function acceptAllCandidates() {
    for (const candidate of candidates.value) {
      createAnnotationFromCandidate(candidate)
    }
    candidates.value = []
    isActive.value = false
  }

  // Internal: insert a candidate into the active file's indexes
  function createAnnotationFromCandidate(candidate) {
    const file = fileStore.activeFile
    if (!file) return

    const offsetKey = String(candidate.begin)
    if (!file.indexes[offsetKey]) file.indexes[offsetKey] = {}
    if (!file.indexes[offsetKey].Entity) file.indexes[offsetKey].Entity = []

    // Build attrs from schema defaults, using candidate attrs for values where available
    const newAttrs = {}
    const schemaAttrs = schemaStore.getEntityAttrs(candidate.semantic)
    for (const sAttr of schemaAttrs) {
      const candidateAttr = candidate.attrs[sAttr.name]
      newAttrs[sAttr.name] = {
        id: generateId(),
        attrKey: sAttr.name,
        attrValue: candidateAttr?.attrValue ?? sAttr.default_value ?? '',
        attrType: sAttr.value_type ?? 'text',
        annotationValue: '',
        attrIcon: '',
      }
    }

    file.indexes[offsetKey].Entity.push({
      id: generateId(),
      semantic: candidate.semantic,
      begin: candidate.begin,
      end: candidate.end,
      type: 'Entity',
      attrs: newAttrs,
    })

    fileStore.markActiveDirty()
  }

  function clearCandidates() {
    candidates.value = []
    isActive.value = false
  }

  // Clear candidates when switching files
  watch(
    () => fileStore.activeFileIndex,
    () => {
      clearCandidates()
    },
  )

  return {
    candidates,
    isActive,
    candidateCount,
    dictionaryMap,
    buildDictionary,
    updateDictionary,
    findCandidates,
    acceptCandidate,
    acceptAllCandidates,
    clearCandidates,
  }
})
