import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { openDB } from 'idb'
import JSZip from 'jszip'

const DB_NAME = 'blu-vocab'
const DB_VERSION = 1
const RECORDS_STORE = 'records'
const METADATA_STORE = 'metadata'
const CHUNK_SIZE = 5000
const LS_INCLUDED_KEY = 'blu-vocab-included'
const DEFAULT_INCLUDED = ['ICD10CM', 'LNC']

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        const store = db.createObjectStore(RECORDS_STORE, { keyPath: ['vocabulary', 'concept_id'] })
        store.createIndex('by-vocabulary', 'vocabulary')
      }
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'name' })
      }
    },
  })
}

function parseTSV(text) {
  const lines = text.split('\n')
  if (lines.length === 0) return []

  // Find header
  const header = lines[0].split('\t').map(h => h.trim())
  const idIdx = header.indexOf('concept_id')
  const termsIdx = header.indexOf('terms')
  const descIdx = header.indexOf('description')

  if (idIdx < 0 || termsIdx < 0 || descIdx < 0) {
    throw new Error('TSV must have columns: concept_id, terms, description')
  }

  const records = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = line.split('\t')
    records.push({
      concept_id: cols[idIdx] || '',
      terms: cols[termsIdx] || '',
      description: cols[descIdx] || '',
    })
  }
  return records
}

export const useVocabularyStore = defineStore('vocabulary', () => {
  const vocabCollections = ref([])
  const indexStatus = ref('idle')
  const indexError = ref(null)
  const totalCachedRecords = ref(0)
  const searchReady = ref(false)
  const indexedDocCount = ref(0)

  let worker = null
  let searchRequestId = 0
  const pendingSearches = new Map()
  let caching = false

  // Load included config from localStorage
  function loadIncludedConfig() {
    try {
      const stored = localStorage.getItem(LS_INCLUDED_KEY)
      return stored ? JSON.parse(stored) : [...DEFAULT_INCLUDED]
    } catch {
      return [...DEFAULT_INCLUDED]
    }
  }

  function saveIncludedConfig(included) {
    localStorage.setItem(LS_INCLUDED_KEY, JSON.stringify(included))
  }

  const systemVocabs = computed(() =>
    vocabCollections.value.filter(v => v.type === 'system'),
  )

  const userVocabs = computed(() =>
    vocabCollections.value.filter(v => v.type === 'user'),
  )

  const includedVocabs = computed(() =>
    vocabCollections.value.filter(v => v.included),
  )

  async function initVocabularies() {
    const db = await getDB()
    const allMeta = await db.getAll(METADATA_STORE)
    const metaMap = new Map(allMeta.map(m => [m.name, m]))

    const included = loadIncludedConfig()

    // System vocabs from build-time scanning
    const systemNames = typeof __VOCAB_FILES__ !== 'undefined' ? __VOCAB_FILES__ : []
    const collections = []

    for (const name of systemNames) {
      const meta = metaMap.get(name)
      collections.push({
        name,
        type: 'system',
        recordCount: meta?.recordCount ?? 0,
        cached: !!meta,
        included: included.includes(name),
      })
    }

    // User vocabs from metadata
    for (const meta of allMeta) {
      if (meta.type === 'user') {
        collections.push({
          name: meta.name,
          type: 'user',
          recordCount: meta.recordCount ?? 0,
          cached: true,
          included: included.includes(meta.name),
        })
      }
    }

    vocabCollections.value = collections
    updateTotalCached()

    // Cache any uncached system vocabs that are included
    await cacheUncachedIncluded()

    // Build search index
    await buildSearchIndex()
  }

  async function cacheUncachedIncluded() {
    const uncached = vocabCollections.value.filter(
      v => v.type === 'system' && !v.cached && v.included,
    )
    for (const vocab of uncached) {
      await cacheVocabulary(vocab.name)
    }
  }

  async function cacheVocabulary(name) {
    if (caching) return
    caching = true
    const prevStatus = indexStatus.value
    indexStatus.value = 'loading'

    try {
      const base = import.meta.env.BASE_URL || '/'
      const url = `${base}data/vocab/${name}.tsv.zip`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

      const arrayBuffer = await response.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)

      // Find the TSV file inside
      const tsvFileName = Object.keys(zip.files).find(f => f.endsWith('.tsv'))
      if (!tsvFileName) throw new Error(`No .tsv file found in ${name}.tsv.zip`)

      const tsvText = await zip.file(tsvFileName).async('string')
      const records = parseTSV(tsvText)

      // Bulk insert into IndexedDB in chunks
      const db = await getDB()
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE)
        const tx = db.transaction(RECORDS_STORE, 'readwrite')
        for (const rec of chunk) {
          tx.store.put({ vocabulary: name, ...rec })
        }
        await tx.done
      }

      // Save metadata
      await db.put(METADATA_STORE, {
        name,
        type: 'system',
        recordCount: records.length,
        cachedAt: new Date().toISOString(),
      })

      // Update collection state
      const col = vocabCollections.value.find(v => v.name === name)
      if (col) {
        col.cached = true
        col.recordCount = records.length
      }

      updateTotalCached()
    } catch (err) {
      console.error(`Failed to cache vocabulary ${name}:`, err)
      indexError.value = err.message
    } finally {
      caching = false
      if (indexStatus.value === 'loading') {
        indexStatus.value = prevStatus
      }
    }
  }

  async function addUserVocabulary(file) {
    const name = file.name.replace(/\.tsv$/i, '')

    // Check for duplicate
    if (vocabCollections.value.some(v => v.name === name)) {
      throw new Error(`Vocabulary "${name}" already exists`)
    }

    const text = await file.text()
    const records = parseTSV(text)

    const db = await getDB()
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE)
      const tx = db.transaction(RECORDS_STORE, 'readwrite')
      for (const rec of chunk) {
        tx.store.put({ vocabulary: name, ...rec })
      }
      await tx.done
    }

    await db.put(METADATA_STORE, {
      name,
      type: 'user',
      recordCount: records.length,
      cachedAt: new Date().toISOString(),
    })

    vocabCollections.value.push({
      name,
      type: 'user',
      recordCount: records.length,
      cached: true,
      included: true,
    })

    // Add to included config
    const included = loadIncludedConfig()
    if (!included.includes(name)) {
      included.push(name)
      saveIncludedConfig(included)
    }

    updateTotalCached()
  }

  async function clearCache(name) {
    const db = await getDB()

    // Delete all records for this vocabulary
    const tx = db.transaction(RECORDS_STORE, 'readwrite')
    const index = tx.store.index('by-vocabulary')
    let cursor = await index.openCursor(IDBKeyRange.only(name))
    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
    await tx.done

    // Delete metadata
    await db.delete(METADATA_STORE, name)

    const col = vocabCollections.value.find(v => v.name === name)
    if (col) {
      col.cached = false
      col.recordCount = 0
    }

    updateTotalCached()
  }

  async function removeUserVocabulary(name) {
    await clearCache(name)
    vocabCollections.value = vocabCollections.value.filter(v => v.name !== name)

    // Remove from included config
    const included = loadIncludedConfig()
    saveIncludedConfig(included.filter(n => n !== name))
  }

  function toggleIncluded(name) {
    const col = vocabCollections.value.find(v => v.name === name)
    if (!col) return
    col.included = !col.included

    const included = vocabCollections.value.filter(v => v.included).map(v => v.name)
    saveIncludedConfig(included)
  }

  function updateTotalCached() {
    totalCachedRecords.value = vocabCollections.value.reduce(
      (sum, v) => sum + (v.cached ? v.recordCount : 0),
      0,
    )
  }

  // Worker management
  function createWorker() {
    if (worker) {
      worker.terminate()
    }
    worker = new Worker(
      new URL('../workers/vocabIndexWorker.js', import.meta.url),
      { type: 'module' },
    )
    worker.onmessage = handleWorkerMessage
    worker.onerror = (err) => {
      console.error('Vocab worker error:', err)
      indexStatus.value = 'error'
      indexError.value = err.message || 'Worker error'
      searchReady.value = false
    }
  }

  function handleWorkerMessage(event) {
    const { type } = event.data

    if (type === 'index-progress') {
      // Could track progress if needed
    } else if (type === 'index-ready') {
      indexStatus.value = 'ready'
      searchReady.value = true
      indexedDocCount.value = event.data.totalDocuments
      indexError.value = null
    } else if (type === 'index-error') {
      indexStatus.value = 'error'
      indexError.value = event.data.error
      searchReady.value = false
    } else if (type === 'search-result') {
      const { id, results, totalCount } = event.data
      const resolve = pendingSearches.get(id)
      if (resolve) {
        pendingSearches.delete(id)
        resolve({ results, totalCount })
      }
    }
  }

  async function buildSearchIndex() {
    const included = vocabCollections.value
      .filter(v => v.included && v.cached)
      .map(v => v.name)

    if (included.length === 0) {
      indexStatus.value = 'idle'
      searchReady.value = false
      return
    }

    indexStatus.value = 'indexing'
    searchReady.value = false

    createWorker()
    worker.postMessage({ type: 'build-index', includedVocabs: included })
  }

  function search(query, options = {}) {
    if (!worker || !searchReady.value) {
      return Promise.resolve({ results: [], totalCount: 0 })
    }

    const id = ++searchRequestId
    return new Promise((resolve) => {
      pendingSearches.set(id, resolve)
      worker.postMessage({
        type: 'search',
        id,
        query,
        options: {
          offset: options.offset || 0,
          limit: options.limit || 20,
        },
      })

      // Timeout after 10s
      setTimeout(() => {
        if (pendingSearches.has(id)) {
          pendingSearches.delete(id)
          resolve({ results: [], totalCount: 0 })
        }
      }, 10000)
    })
  }

  return {
    vocabCollections,
    indexStatus,
    indexError,
    totalCachedRecords,
    searchReady,
    indexedDocCount,
    systemVocabs,
    userVocabs,
    includedVocabs,
    initVocabularies,
    cacheVocabulary,
    addUserVocabulary,
    clearCache,
    removeUserVocabulary,
    toggleIncluded,
    buildSearchIndex,
    search,
  }
})
