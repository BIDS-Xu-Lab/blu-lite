#!/usr/bin/env bun
import { Database } from 'bun:sqlite'
import { createReadStream, existsSync, mkdirSync, rmSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, resolve } from 'node:path'

const DEFAULT_BATCH_SIZE = 50000
const DEFAULT_MAX_TERMS = 10

function printHelp() {
  console.log(`\nUsage:\n  bun scripts/build-index-db.js --input <path/to/file.tsv> --output <path/to/index.db> [options]\n\nOptions:\n  -i, --input       Input TSV file path (required)\n  -o, --output      Output SQLite DB path (required)\n  --batch-size      Insert batch size (default: ${DEFAULT_BATCH_SIZE})\n  --max-terms       Max number of terms kept per row (default: ${DEFAULT_MAX_TERMS})\n  -h, --help        Show help\n\nTSV format:\n  CUI<TAB>Terms\n  where Terms can be pipe-delimited, e.g. term1|term2|term3\n`)
}

function parseArgs(argv) {
  const args = {
    input: '',
    output: '',
    batchSize: DEFAULT_BATCH_SIZE,
    maxTerms: DEFAULT_MAX_TERMS,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]

    if (token === '-h' || token === '--help') {
      args.help = true
      continue
    }

    if (token === '-i' || token === '--input') {
      args.input = next || ''
      i += 1
      continue
    }

    if (token === '-o' || token === '--output') {
      args.output = next || ''
      i += 1
      continue
    }

    if (token === '--batch-size') {
      args.batchSize = Number(next || DEFAULT_BATCH_SIZE)
      i += 1
      continue
    }

    if (token === '--max-terms') {
      args.maxTerms = Number(next || DEFAULT_MAX_TERMS)
      i += 1
      continue
    }
  }

  return args
}

function normalizeTerms(rawTerms, maxTerms) {
  if (!rawTerms) return ''
  return rawTerms
    .split('|')
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, maxTerms)
    .join('|')
}

function parseRow(line, maxTerms) {
  const tabIdx = line.indexOf('\t')
  if (tabIdx < 0) return null

  const cui = line.slice(0, tabIdx).trim()
  const terms = normalizeTerms(line.slice(tabIdx + 1), maxTerms)
  if (!cui || !terms) return null

  return { cui, terms }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  if (!args.input || !args.output) {
    printHelp()
    throw new Error('Both --input and --output are required.')
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize <= 0) {
    throw new Error('--batch-size must be a positive integer.')
  }

  if (!Number.isInteger(args.maxTerms) || args.maxTerms <= 0) {
    throw new Error('--max-terms must be a positive integer.')
  }

  const inputPath = resolve(process.cwd(), args.input)
  const outputPath = resolve(process.cwd(), args.output)

  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  if (existsSync(outputPath)) {
    rmSync(outputPath)
  }

  console.log(`Building concept index DB for searching`)
  console.log(`Input: ${inputPath}`)
  console.log(`Output: ${outputPath}`)

  const db = new Database(outputPath)
  db.exec('PRAGMA journal_mode=DELETE;')
  db.exec('PRAGMA synchronous=OFF;')
  db.exec('PRAGMA temp_store=MEMORY;')

  db.exec(`
    CREATE TABLE concepts (
      cui TEXT PRIMARY KEY,
      terms TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE concepts_fts USING fts5(
      cui,
      terms,
      content='concepts',
      content_rowid='rowid',
      tokenize='unicode61'
    );
  `)

  const insertStmt = db.prepare('INSERT OR REPLACE INTO concepts (cui, terms) VALUES (?, ?)')

  const rl = createInterface({
    input: createReadStream(inputPath),
    crlfDelay: Infinity,
  })

  let buffer = []
  let inserted = 0
  let lineNo = 0

  for await (const line of rl) {
    lineNo += 1
    if (!line) continue
    if (lineNo === 1 && /^CUI\tTerms$/i.test(line.trim())) continue

    const row = parseRow(line, args.maxTerms)
    if (!row) continue

    buffer.push(row)

    if (buffer.length >= args.batchSize) {
      db.exec('BEGIN')
      for (const item of buffer) {
        insertStmt.run(item.cui, item.terms)
      }
      db.exec('COMMIT')

      inserted += buffer.length
      buffer = []
      console.log(`Inserted ${inserted.toLocaleString()} rows (line ${lineNo.toLocaleString()})`)
    }
  }

  if (buffer.length > 0) {
    db.exec('BEGIN')
    for (const item of buffer) {
      insertStmt.run(item.cui, item.terms)
    }
    db.exec('COMMIT')

    inserted += buffer.length
    console.log(`Inserted ${inserted.toLocaleString()} rows (final batch)`)
  }

  console.log('Rebuilding FTS index...')
  db.exec("INSERT INTO concepts_fts(concepts_fts) VALUES('rebuild')")
  db.exec("INSERT INTO concepts_fts(concepts_fts) VALUES('optimize')")

  console.log('Vacuuming...')
  db.exec('VACUUM')
  db.close()

  console.log(`Done. Wrote ${outputPath}`)
  console.log(`Total concepts: ${inserted.toLocaleString()}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
