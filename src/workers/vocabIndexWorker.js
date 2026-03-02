import MiniSearch from 'minisearch'
import { openDB } from 'idb'

const DB_NAME = 'blu-vocab'
const DB_VERSION = 1
const RECORDS_STORE = 'records'
const INDEX_CHUNK = 10000

let miniSearch = null

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        const store = db.createObjectStore(RECORDS_STORE, { keyPath: ['vocabulary', 'concept_id'] })
        store.createIndex('by-vocabulary', 'vocabulary')
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'name' })
      }
    },
  })
}

async function buildIndex(includedVocabs) {
  try {
    miniSearch = new MiniSearch({
      fields: ['terms', 'description'],
      storeFields: ['concept_id', 'terms', 'description', 'vocabulary'],
      idField: 'uid',
      searchOptions: {
        boost: { terms: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    })

    const db = await getDB()

    // Count total records across all included vocabs
    let total = 0
    for (const vocabName of includedVocabs) {
      const count = await db.countFromIndex(RECORDS_STORE, 'by-vocabulary', IDBKeyRange.only(vocabName))
      total += count
    }

    let loaded = 0
    const batch = []

    for (const vocabName of includedVocabs) {
      const tx = db.transaction(RECORDS_STORE, 'readonly')
      const index = tx.store.index('by-vocabulary')
      let cursor = await index.openCursor(IDBKeyRange.only(vocabName))

      while (cursor) {
        const rec = cursor.value
        batch.push({
          uid: `${rec.vocabulary}::${rec.concept_id}`,
          concept_id: rec.concept_id,
          terms: rec.terms,
          description: rec.description,
          vocabulary: rec.vocabulary,
        })

        if (batch.length >= INDEX_CHUNK) {
          miniSearch.addAll(batch.splice(0, batch.length))
          loaded += INDEX_CHUNK
          self.postMessage({ type: 'index-progress', loaded, total })
        }

        cursor = await cursor.continue()
      }
    }

    // Add remaining
    if (batch.length > 0) {
      miniSearch.addAll(batch)
      loaded += batch.length
      self.postMessage({ type: 'index-progress', loaded, total })
    }

    self.postMessage({ type: 'index-ready', totalDocuments: miniSearch.documentCount })
  } catch (err) {
    self.postMessage({ type: 'index-error', error: err.message })
  }
}

function handleSearch(id, query, options = {}) {
  if (!miniSearch) {
    self.postMessage({ type: 'search-result', id, results: [], totalCount: 0 })
    return
  }

  try {
    const allResults = miniSearch.search(query, { limit: 1000 })
    const offset = options.offset || 0
    const limit = options.limit || 20
    const page = allResults.slice(offset, offset + limit)

    self.postMessage({
      type: 'search-result',
      id,
      results: page,
      totalCount: allResults.length,
    })
  } catch (err) {
    self.postMessage({ type: 'search-result', id, results: [], totalCount: 0 })
  }
}

self.onmessage = (event) => {
  const { type } = event.data

  if (type === 'build-index') {
    buildIndex(event.data.includedVocabs)
  } else if (type === 'search') {
    handleSearch(event.data.id, event.data.query, event.data.options)
  } else if (type === 'clear') {
    miniSearch = null
  }
}
