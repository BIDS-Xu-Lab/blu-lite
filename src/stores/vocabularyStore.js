import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const LS_USER_SOURCES_KEY = 'blu-vocab-user-sources-v2'
const LS_SELECTED_SOURCE_KEY = 'blu-vocab-selected-source-v2'
const DEFAULT_SOURCE_ID = 'default-icd10cm'

export const useVocabularyStore = defineStore('vocabulary', () => {
  const base = import.meta.env.BASE_URL || '/'
  const defaultSource = {
    id: DEFAULT_SOURCE_ID,
    name: 'ICD10CM',
    type: 'default',
    opfsName: 'ICD10CM.db',
    url: `${base}data/vocab/ICD10CM.db`,
    locked: true,
  }

  const userSources = ref([])
  const selectedSourceId = ref(DEFAULT_SOURCE_ID)
  const sourceCache = ref({})

  const indexStatus = ref('idle')
  const indexError = ref(null)
  const searchReady = ref(false)
  const indexedDocCount = ref(0)
  const loadProgress = ref({ phase: 'idle', percent: 0 })
  const isClearingCache = ref(false)
  const isManagingSources = ref(false)

  const indexName = computed(() => currentSource.value?.name || defaultSource.name)
  const sources = computed(() => [
    defaultSource,
    ...userSources.value,
  ].map((source) => {
    const cache = sourceCache.value[source.id] || { cached: false, size: 0 }
    return {
      ...source,
      cached: cache.cached,
      size: cache.size,
    }
  }))
  const currentSource = computed(() =>
    sources.value.find((source) => source.id === selectedSourceId.value) || defaultSource,
  )

  let worker = null
  let initPromise = null
  let searchRequestId = 0
  const pendingSearches = new Map()
  let opRequestId = 0
  const pendingOps = new Map()
  let selectedLoadedSourceId = null

  function normalizeFileName(fileName) {
    const safe = fileName
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
    return safe || `vocab_${Date.now()}.db`
  }

  function ensureDbExtension(name) {
    return name.toLowerCase().endsWith('.db') ? name : `${name}.db`
  }

  function getDefaultSource() {
    return { ...defaultSource }
  }

  function loadPersistedSources() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LS_USER_SOURCES_KEY) || '[]')
      userSources.value = Array.isArray(parsed)
        ? parsed.filter((item) => item && item.id && item.name && item.opfsName)
        : []
    } catch {
      userSources.value = []
    }

    const persistedSelected = localStorage.getItem(LS_SELECTED_SOURCE_KEY)
    if (persistedSelected) {
      selectedSourceId.value = persistedSelected
    }

    if (!sources.value.some((item) => item.id === selectedSourceId.value)) {
      selectedSourceId.value = DEFAULT_SOURCE_ID
    }
  }

  function persistSources() {
    localStorage.setItem(LS_USER_SOURCES_KEY, JSON.stringify(userSources.value))
    localStorage.setItem(LS_SELECTED_SOURCE_KEY, selectedSourceId.value)
  }

  async function getOpfsRoot() {
    if (!navigator?.storage?.getDirectory) {
      throw new Error('OPFS is not available in this browser context.')
    }
    return navigator.storage.getDirectory()
  }

  async function getOpfsFileSize(opfsName) {
    const root = await getOpfsRoot()
    try {
      const handle = await root.getFileHandle(opfsName)
      const file = await handle.getFile()
      return file.size
    } catch {
      return 0
    }
  }

  async function writeFileToOpfs(opfsName, bytes) {
    const root = await getOpfsRoot()
    const handle = await root.getFileHandle(opfsName, { create: true })
    const writable = await handle.createWritable()
    try {
      await writable.write(bytes)
      await writable.close()
    } catch (err) {
      await writable.abort()
      throw err
    }
  }

  async function refreshCacheStatus() {
    const updated = {}
    for (const source of sources.value) {
      const size = await getOpfsFileSize(source.opfsName)
      updated[source.id] = { cached: size > 0, size }
    }
    sourceCache.value = updated
  }

  function createWorker() {
    if (worker) return worker

    worker = new Worker(
      new URL('../workers/sqliteVocabWorker.js', import.meta.url),
      { type: 'module' },
    )

    worker.onmessage = (event) => {
      const { type } = event.data || {}

      if (type === 'init-progress') {
        loadProgress.value = {
          phase: event.data.phase || 'loading',
          percent: Number(event.data.percent || 0),
        }
      } else if (type === 'init-ready') {
        indexedDocCount.value = Number(event.data.recordCount || 0)
        indexStatus.value = 'ready'
        indexError.value = null
        searchReady.value = true
        loadProgress.value = { phase: 'ready', percent: 100 }
      } else if (type === 'init-error') {
        indexStatus.value = 'error'
        indexError.value = event.data.error || 'Vocabulary initialization failed'
        searchReady.value = false
      } else if (type === 'search-result') {
        const { id, results, totalCount } = event.data
        const resolve = pendingSearches.get(id)
        if (resolve) {
          pendingSearches.delete(id)
          resolve({ results: results || [], totalCount: Number(totalCount || 0) })
        }
      } else if (type === 'cache-cleared' || type === 'cache-clear-error') {
        const { id, error } = event.data
        const handlers = pendingOps.get(id)
        if (handlers) {
          pendingOps.delete(id)
          if (type === 'cache-cleared') {
            handlers.resolve()
          } else {
            handlers.reject(new Error(error || 'Failed to clear vocabulary cache'))
          }
        }
      }
    }

    worker.onerror = (err) => {
      indexStatus.value = 'error'
      indexError.value = err.message || 'Vocabulary worker error'
      searchReady.value = false
    }

    return worker
  }

  async function initVocabulary(sourceId = selectedSourceId.value) {
    if (!sources.value.length) {
      loadPersistedSources()
      await refreshCacheStatus()
    }

    if (sourceId && selectedSourceId.value !== sourceId) {
      selectedSourceId.value = sourceId
      persistSources()
    }

    const source = currentSource.value || getDefaultSource()

    if (
      searchReady.value
      && indexStatus.value === 'ready'
      && selectedLoadedSourceId === source.id
    ) {
      return
    }

    if (initPromise) return initPromise

    indexStatus.value = 'loading'
    indexError.value = null
    loadProgress.value = { phase: 'loading', percent: 0 }

    const activeWorker = createWorker()

    initPromise = new Promise((resolve, reject) => {
      const onMessage = (event) => {
        const { type } = event.data || {}
        if (type === 'init-ready') {
          activeWorker.removeEventListener('message', onMessage)
          selectedLoadedSourceId = source.id
          initPromise = null
          refreshCacheStatus().catch(() => {})
          resolve()
        } else if (type === 'init-error') {
          activeWorker.removeEventListener('message', onMessage)
          initPromise = null
          reject(new Error(event.data.error || 'Vocabulary initialization failed'))
        }
      }

      activeWorker.addEventListener('message', onMessage)
      activeWorker.postMessage({
        type: 'init',
        dbUrl: source.url || null,
        opfsName: source.opfsName,
        vocabulary: source.name,
      })
    })

    return initPromise
  }

  function search(query, options = {}) {
    if (!worker || !searchReady.value || !query?.trim()) {
      return Promise.resolve({ results: [], totalCount: 0 })
    }

    const id = ++searchRequestId
    const offset = Number(options.offset || 0)
    const limit = Number(options.limit || 20)

    return new Promise((resolve) => {
      pendingSearches.set(id, resolve)
      worker.postMessage({
        type: 'search',
        id,
        query,
        options: { offset, limit },
      })

      setTimeout(() => {
        if (pendingSearches.has(id)) {
          pendingSearches.delete(id)
          resolve({ results: [], totalCount: 0 })
        }
      }, 10000)
    })
  }

  function createOpRequest(opfsName) {
    const activeWorker = createWorker()
    const id = ++opRequestId

    return new Promise((resolve, reject) => {
      pendingOps.set(id, { resolve, reject })
      activeWorker.postMessage({ type: 'clear-cache', id, opfsName })
    })
  }

  async function clearVocabularyCache() {
    const source = currentSource.value
    if (!source) return

    isClearingCache.value = true
    try {
      await createOpRequest(source.opfsName)

      searchReady.value = false
      indexStatus.value = 'idle'
      indexError.value = null
      indexedDocCount.value = 0
      loadProgress.value = { phase: 'idle', percent: 0 }
      selectedLoadedSourceId = null
      initPromise = null
      await refreshCacheStatus()
    } finally {
      isClearingCache.value = false
    }
  }

  async function setSelectedSource(sourceId, autoLoad = true) {
    if (!sources.value.some((item) => item.id === sourceId)) {
      throw new Error('Unknown vocabulary source.')
    }

    selectedSourceId.value = sourceId
    persistSources()

    if (autoLoad) {
      await initVocabulary(sourceId)
    }
  }

  async function addUrlSource({ url, name }) {
    const parsed = new URL(url)
    const rawFileName = parsed.pathname.split('/').pop() || `vocab_${Date.now()}.db`
    const opfsBaseName = ensureDbExtension(normalizeFileName(rawFileName))

    const existingNames = new Set(sources.value.map((item) => item.opfsName))
    let candidate = opfsBaseName
    let n = 1
    while (existingNames.has(candidate)) {
      candidate = opfsBaseName.replace(/\.db$/i, `_${n}.db`)
      n += 1
    }

    const source = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: (name || opfsBaseName.replace(/\.db$/i, '')).trim(),
      type: 'url',
      opfsName: candidate,
      url: parsed.toString(),
      locked: false,
    }

    userSources.value.push(source)
    selectedSourceId.value = source.id
    persistSources()
    await refreshCacheStatus()
    await initVocabulary(source.id)
  }

  async function addLocalSource(file, displayName = '') {
    if (!file) {
      throw new Error('No file selected.')
    }

    const sourceName = (displayName || file.name.replace(/\.db$/i, '') || 'Local Vocabulary').trim()
    const opfsBaseName = ensureDbExtension(normalizeFileName(file.name || `${sourceName}.db`))

    const existingNames = new Set(sources.value.map((item) => item.opfsName))
    let candidate = opfsBaseName
    let n = 1
    while (existingNames.has(candidate)) {
      candidate = opfsBaseName.replace(/\.db$/i, `_${n}.db`)
      n += 1
    }

    const bytes = await file.arrayBuffer()
    await writeFileToOpfs(candidate, bytes)

    const source = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: sourceName,
      type: 'local',
      opfsName: candidate,
      url: null,
      locked: false,
    }

    userSources.value.push(source)
    selectedSourceId.value = source.id
    persistSources()
    await refreshCacheStatus()
    await initVocabulary(source.id)
  }

  async function removeSource(sourceId) {
    const source = sources.value.find((item) => item.id === sourceId)
    if (!source || source.locked) return

    isManagingSources.value = true
    try {
      await createOpRequest(source.opfsName)

      userSources.value = userSources.value.filter((item) => item.id !== sourceId)
      if (selectedSourceId.value === sourceId) {
        selectedSourceId.value = DEFAULT_SOURCE_ID
        selectedLoadedSourceId = null
      }
      persistSources()
      await refreshCacheStatus()

      if (selectedSourceId.value === DEFAULT_SOURCE_ID) {
        await initVocabulary(DEFAULT_SOURCE_ID)
      }
    } finally {
      isManagingSources.value = false
    }
  }

  loadPersistedSources()
  refreshCacheStatus().catch(() => {})

  return {
    indexName,
    indexStatus,
    indexError,
    searchReady,
    indexedDocCount,
    loadProgress,
    isClearingCache,
    isManagingSources,
    sources,
    selectedSourceId,
    currentSource,
    initVocabulary,
    clearVocabularyCache,
    setSelectedSource,
    addUrlSource,
    addLocalSource,
    removeSource,
    search,
  }
})
