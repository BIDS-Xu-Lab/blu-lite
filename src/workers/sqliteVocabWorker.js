import sqlite3InitModule from '@sqlite.org/sqlite-wasm'

let sqlite3 = null
let db = null
let currentOpfsName = null
let currentVocabulary = ''
let initStarted = false
let initDone = false

function postInitProgress(phase, percent) {
  self.postMessage({ type: 'init-progress', phase, percent })
}

async function ensureSqliteLoaded() {
  if (sqlite3) return sqlite3
  postInitProgress('loading-sqlite', 0)
  sqlite3 = await sqlite3InitModule()
  postInitProgress('loading-sqlite', 100)
  return sqlite3
}

async function getOpfsFileSize(fileName) {
  const root = await navigator.storage.getDirectory()
  try {
    const fileHandle = await root.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    return file.size
  } catch {
    return 0
  }
}

async function streamDownloadToOpfs(dbUrl, fileName) {
  const response = await fetch(dbUrl)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download vocabulary DB (${response.status})`)
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  const reader = response.body.getReader()

  let received = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      await writable.write(value)
      received += value.byteLength

      if (contentLength > 0) {
        const percent = Math.min(100, Math.floor((received / contentLength) * 100))
        postInitProgress('downloading', percent)
      }
    }
    await writable.close()
  } catch (err) {
    await writable.abort()
    throw err
  }

  postInitProgress('downloading', 100)
}

function buildMatchQuery(query) {
  const terms = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => `"${token.replace(/"/g, '""')}"*`)

  return terms.join(' ')
}

async function openDb(opfsName) {
  if (db) {
    db.close()
    db = null
  }

  db = new sqlite3.oo1.OpfsDb(`/${opfsName}`)
  currentOpfsName = opfsName
}

async function initDb({ dbUrl, opfsName, vocabulary }) {
  if (!opfsName) {
    self.postMessage({ type: 'init-error', error: 'Missing OPFS file name.' })
    return
  }

  if (initDone && db && currentOpfsName === opfsName) {
    const row = Number(db.selectValue('SELECT COUNT(*) FROM concepts') || 0)
    self.postMessage({ type: 'init-ready', recordCount: row })
    return
  }

  if (initStarted) return
  initStarted = true

  try {
    await ensureSqliteLoaded()

    const existingSize = await getOpfsFileSize(opfsName)
    if (existingSize <= 0) {
      if (!dbUrl) {
        throw new Error(`Cached DB not found in OPFS: ${opfsName}`)
      }
      postInitProgress('downloading', 0)
      await streamDownloadToOpfs(dbUrl, opfsName)
    }

    postInitProgress('opening-db', 0)
    await openDb(opfsName)
    currentVocabulary = vocabulary || opfsName.replace(/\.db$/i, '')
    const recordCount = Number(db.selectValue('SELECT COUNT(*) FROM concepts') || 0)
    postInitProgress('opening-db', 100)

    initDone = true
    initStarted = false
    self.postMessage({ type: 'init-ready', recordCount })
  } catch (err) {
    initStarted = false
    initDone = false
    self.postMessage({ type: 'init-error', error: err instanceof Error ? err.message : String(err) })
  }
}

async function clearCache(id, opfsName) {
  try {
    const targetName = opfsName || currentOpfsName
    if (!targetName) {
      self.postMessage({ type: 'cache-cleared', id })
      return
    }

    if (db && currentOpfsName === targetName) {
      db.close()
      db = null
      currentOpfsName = null
      currentVocabulary = ''
      initDone = false
      initStarted = false
    }

    const root = await navigator.storage.getDirectory()
    try {
      await root.removeEntry(targetName)
    } catch {
      // File may already be absent.
    }

    self.postMessage({ type: 'cache-cleared', id })
  } catch (err) {
    self.postMessage({
      type: 'cache-clear-error',
      id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function doSearch(id, query, options = {}) {
  if (!db || !initDone) {
    self.postMessage({ type: 'search-result', id, results: [], totalCount: 0 })
    return
  }

  try {
    const offset = Number(options.offset || 0)
    const limit = Number(options.limit || 20)
    const matchQuery = buildMatchQuery(query)

    if (!matchQuery) {
      self.postMessage({ type: 'search-result', id, results: [], totalCount: 0 })
      return
    }

    const totalCount = Number(db.selectValue(
      'SELECT COUNT(*) FROM concepts_fts WHERE concepts_fts MATCH ?',
      matchQuery,
    ) || 0)

    const rows = db.selectArrays(
      `SELECT c.cui, c.terms, bm25(concepts_fts) AS rank
       FROM concepts_fts
       JOIN concepts c ON c.rowid = concepts_fts.rowid
       WHERE concepts_fts MATCH ?
       ORDER BY rank
       LIMIT ? OFFSET ?`,
      [matchQuery, limit, offset],
    )

    const results = rows.map((row) => ({
      concept_id: row[0],
      terms: row[1],
      vocabulary: currentVocabulary,
    }))

    self.postMessage({
      type: 'search-result',
      id,
      results,
      totalCount,
    })
  } catch {
    self.postMessage({ type: 'search-result', id, results: [], totalCount: 0 })
  }
}

self.onmessage = (event) => {
  const { type } = event.data || {}

  if (type === 'init') {
    initDb(event.data)
  } else if (type === 'clear-cache') {
    clearCache(event.data.id, event.data.opfsName)
  } else if (type === 'search') {
    doSearch(event.data.id, event.data.query || '', event.data.options || {})
  }
}
