function isObject(value) {
  return value && typeof value === 'object'
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0
}

export function flattenAnnotations(indexes) {
  const entities = []
  const relations = []
  if (!isObject(indexes)) {
    return { entities, relations }
  }

  for (const indexData of Object.values(indexes)) {
    if (Array.isArray(indexData?.Entity)) {
      for (const entity of indexData.Entity) {
        entities.push({
          begin: safeNumber(entity.begin),
          end: safeNumber(entity.end),
          semantic: entity.semantic || '',
          type: 'Entity',
        })
      }
    }
    if (Array.isArray(indexData?.Relation)) {
      for (const relation of indexData.Relation) {
        relations.push({
          semantic: relation.semantic || '',
          type: 'Relation',
          fromEnt: {
            begin: safeNumber(relation.fromEnt?.begin),
            end: safeNumber(relation.fromEnt?.end),
            semantic: relation.fromEnt?.semantic || '',
          },
          toEnt: {
            begin: safeNumber(relation.toEnt?.begin),
            end: safeNumber(relation.toEnt?.end),
            semantic: relation.toEnt?.semantic || '',
          },
        })
      }
    }
  }

  return { entities, relations }
}

export function parseAnnotationDocument(parsed, fileName) {
  const { entities, relations } = flattenAnnotations(parsed.indexes)
  return {
    fileName,
    content: typeof parsed.content === 'string' ? parsed.content : '',
    entities,
    relations,
  }
}

export function intervalOverlaps(aBegin, aEnd, bBegin, bEnd) {
  return Math.max(aBegin, bBegin) < Math.min(aEnd, bEnd)
}

export function entityStrictMatch(a, b) {
  return a.semantic === b.semantic && a.begin === b.begin && a.end === b.end
}

export function entityRelaxedMatch(a, b) {
  return a.semantic === b.semantic && intervalOverlaps(a.begin, a.end, b.begin, b.end)
}

export function relationStrictMatch(a, b) {
  return (
    a.semantic === b.semantic &&
    entityStrictMatch(a.fromEnt, b.fromEnt) &&
    entityStrictMatch(a.toEnt, b.toEnt)
  )
}

export function relationRelaxedMatch(a, b) {
  return (
    a.semantic === b.semantic &&
    entityRelaxedMatch(a.fromEnt, b.fromEnt) &&
    entityRelaxedMatch(a.toEnt, b.toEnt)
  )
}

function matchCounts(predItems, goldItems, matcher) {
  const matchedGoldIndexes = new Set()
  let tp = 0

  for (const pred of predItems) {
    let matchedIndex = -1
    for (let i = 0; i < goldItems.length; i++) {
      if (matchedGoldIndexes.has(i)) continue
      if (matcher(pred, goldItems[i])) {
        matchedIndex = i
        break
      }
    }
    if (matchedIndex >= 0) {
      matchedGoldIndexes.add(matchedIndex)
      tp++
    }
  }

  const fp = predItems.length - tp
  const fn = goldItems.length - tp
  return { tp, fp, fn }
}

export function countsToMetrics(counts) {
  const precision = counts.tp + counts.fp === 0 ? 0 : counts.tp / (counts.tp + counts.fp)
  const recall = counts.tp + counts.fn === 0 ? 0 : counts.tp / (counts.tp + counts.fn)
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  return { precision, recall, f1 }
}

export function evaluateItems(predItems, goldItems, strictMatcher, relaxedMatcher) {
  const strictCounts = matchCounts(predItems, goldItems, strictMatcher)
  const relaxedCounts = matchCounts(predItems, goldItems, relaxedMatcher)
  return {
    strict: { ...strictCounts, ...countsToMetrics(strictCounts) },
    relaxed: { ...relaxedCounts, ...countsToMetrics(relaxedCounts) },
  }
}

export function evaluateDocument(predDoc, goldDoc) {
  const predEntities = predDoc?.entities ?? []
  const goldEntities = goldDoc?.entities ?? []
  const predRelations = predDoc?.relations ?? []
  const goldRelations = goldDoc?.relations ?? []

  const entities = evaluateItems(predEntities, goldEntities, entityStrictMatch, entityRelaxedMatch)
  const relations = evaluateItems(predRelations, goldRelations, relationStrictMatch, relationRelaxedMatch)

  const strictCombinedCounts = {
    tp: entities.strict.tp + relations.strict.tp,
    fp: entities.strict.fp + relations.strict.fp,
    fn: entities.strict.fn + relations.strict.fn,
  }
  const relaxedCombinedCounts = {
    tp: entities.relaxed.tp + relations.relaxed.tp,
    fp: entities.relaxed.fp + relations.relaxed.fp,
    fn: entities.relaxed.fn + relations.relaxed.fn,
  }

  return {
    entities,
    relations,
    combined: {
      strict: { ...strictCombinedCounts, ...countsToMetrics(strictCombinedCounts) },
      relaxed: { ...relaxedCombinedCounts, ...countsToMetrics(relaxedCombinedCounts) },
    },
  }
}

export function aggregateMetrics(metricList, key) {
  const counts = metricList.reduce((acc, item) => {
    acc.tp += item[key].tp
    acc.fp += item[key].fp
    acc.fn += item[key].fn
    return acc
  }, { tp: 0, fp: 0, fn: 0 })
  return { ...counts, ...countsToMetrics(counts) }
}

export function evaluateCorpus(predDocsMap, goldDocsMap) {
  const allDocNames = Array.from(new Set([
    ...Array.from(goldDocsMap.keys()),
    ...Array.from(predDocsMap.keys()),
  ])).sort()

  const documentResults = allDocNames.map((fileName) => {
    const predDoc = predDocsMap.get(fileName) ?? { fileName, content: '', entities: [], relations: [] }
    const goldDoc = goldDocsMap.get(fileName) ?? { fileName, content: '', entities: [], relations: [] }
    return {
      fileName,
      ...evaluateDocument(predDoc, goldDoc),
      predCounts: { entities: predDoc.entities.length, relations: predDoc.relations.length },
      goldCounts: { entities: goldDoc.entities.length, relations: goldDoc.relations.length },
    }
  })

  const entities = {
    strict: aggregateMetrics(documentResults.map((r) => r.entities), 'strict'),
    relaxed: aggregateMetrics(documentResults.map((r) => r.entities), 'relaxed'),
  }
  const relations = {
    strict: aggregateMetrics(documentResults.map((r) => r.relations), 'strict'),
    relaxed: aggregateMetrics(documentResults.map((r) => r.relations), 'relaxed'),
  }
  const combined = {
    strict: aggregateMetrics(documentResults.map((r) => r.combined), 'strict'),
    relaxed: aggregateMetrics(documentResults.map((r) => r.combined), 'relaxed'),
  }

  return { documentResults, corpus: { entities, relations, combined } }
}

export function matchStatus(item, referenceItems, strictMatcher, relaxedMatcher) {
  if (referenceItems.some((ref) => strictMatcher(item, ref))) return 'strict'
  if (referenceItems.some((ref) => relaxedMatcher(item, ref))) return 'relaxed'
  return 'mismatch'
}

export function buildHighlightSegments(content, spans) {
  const boundaries = new Set([0, content.length])
  for (const span of spans) {
    const start = Math.max(0, Math.min(content.length, span.begin))
    const end = Math.max(start, Math.min(content.length, span.end))
    boundaries.add(start)
    boundaries.add(end)
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b)
  const segments = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (start === end) continue
    const highlighted = spans.some((span) => intervalOverlaps(start, end, span.begin, span.end))
    segments.push({ text: content.slice(start, end), highlighted })
  }
  return segments
}
