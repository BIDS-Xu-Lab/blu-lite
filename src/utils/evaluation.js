function isObject(value) {
  return value && typeof value === 'object'
}

function parseOffset(value) {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function normalizeSpan(beginValue, endValue) {
  const begin = parseOffset(beginValue)
  const end = parseOffset(endValue)
  if (begin === null || end === null) return null
  if (end < begin) return { begin: end, end: begin }
  return { begin, end }
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
        const span = normalizeSpan(entity.begin, entity.end)
        if (!span) continue
        entities.push({
          begin: span.begin,
          end: span.end,
          semantic: entity.semantic || '',
          type: 'Entity',
        })
      }
    }
    if (Array.isArray(indexData?.Relation)) {
      for (const relation of indexData.Relation) {
        const fromSpan = normalizeSpan(relation.fromEnt?.begin, relation.fromEnt?.end)
        const toSpan = normalizeSpan(relation.toEnt?.begin, relation.toEnt?.end)
        if (!fromSpan || !toSpan) continue
        relations.push({
          semantic: relation.semantic || '',
          type: 'Relation',
          fromEnt: {
            begin: fromSpan.begin,
            end: fromSpan.end,
            semantic: relation.fromEnt?.semantic || '',
          },
          toEnt: {
            begin: toSpan.begin,
            end: toSpan.end,
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
  const adjacency = predItems.map((pred) => {
    const candidates = []
    for (let gi = 0; gi < goldItems.length; gi++) {
      if (matcher(pred, goldItems[gi])) candidates.push(gi)
    }
    return candidates
  })

  const goldMatchedByPred = new Array(goldItems.length).fill(-1)

  function tryMatch(predIndex, visitedGold) {
    for (const goldIndex of adjacency[predIndex]) {
      if (visitedGold[goldIndex]) continue
      visitedGold[goldIndex] = true
      if (goldMatchedByPred[goldIndex] === -1 || tryMatch(goldMatchedByPred[goldIndex], visitedGold)) {
        goldMatchedByPred[goldIndex] = predIndex
        return true
      }
    }
    return false
  }

  let tp = 0
  for (let pi = 0; pi < predItems.length; pi++) {
    const visitedGold = new Array(goldItems.length).fill(false)
    if (tryMatch(pi, visitedGold)) tp++
  }

  return {
    tp,
    fp: predItems.length - tp,
    fn: goldItems.length - tp,
  }
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

export function evaluateByEntityType(predEntities, goldEntities) {
  const allTypes = new Set([
    ...predEntities.map((e) => e.semantic),
    ...goldEntities.map((e) => e.semantic),
  ])
  const result = {}
  for (const type of allTypes) {
    const predOfType = predEntities.filter((e) => e.semantic === type)
    const goldOfType = goldEntities.filter((e) => e.semantic === type)
    result[type] = evaluateItems(predOfType, goldOfType, entityStrictMatch, entityRelaxedMatch)
  }
  return result
}

export function computeCharKappa(predDoc, goldDoc) {
  const content = predDoc?.content || goldDoc?.content || ''
  const n = content.length
  if (n === 0) return null

  const predLabels = new Array(n).fill('O')
  const goldLabels = new Array(n).fill('O')

  for (const entity of (predDoc?.entities ?? [])) {
    const begin = Math.max(0, entity.begin)
    const end = Math.min(n, entity.end)
    for (let i = begin; i < end; i++) predLabels[i] = entity.semantic
  }

  for (const entity of (goldDoc?.entities ?? [])) {
    const begin = Math.max(0, entity.begin)
    const end = Math.min(n, entity.end)
    for (let i = begin; i < end; i++) goldLabels[i] = entity.semantic
  }

  let agree = 0
  const predFreq = {}
  const goldFreq = {}

  for (let i = 0; i < n; i++) {
    if (predLabels[i] === goldLabels[i]) agree++
    predFreq[predLabels[i]] = (predFreq[predLabels[i]] || 0) + 1
    goldFreq[goldLabels[i]] = (goldFreq[goldLabels[i]] || 0) + 1
  }

  const Po = agree / n
  const allLabels = new Set([...Object.keys(predFreq), ...Object.keys(goldFreq)])
  let Pe = 0
  for (const label of allLabels) {
    Pe += ((predFreq[label] || 0) / n) * ((goldFreq[label] || 0) / n)
  }

  if (1 - Pe < 1e-10) return 1
  return (Po - Pe) / (1 - Pe)
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
    kappa: computeCharKappa(predDoc, goldDoc),
    entityTypeMetrics: evaluateByEntityType(predEntities, goldEntities),
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

  const kappaValues = documentResults.map((r) => r.kappa).filter((k) => k !== null)
  const kappa = kappaValues.length > 0
    ? kappaValues.reduce((a, b) => a + b, 0) / kappaValues.length
    : null

  const typeCountsMap = {}
  for (const docResult of documentResults) {
    for (const [type, metrics] of Object.entries(docResult.entityTypeMetrics ?? {})) {
      if (!typeCountsMap[type]) {
        typeCountsMap[type] = { strict: { tp: 0, fp: 0, fn: 0 }, relaxed: { tp: 0, fp: 0, fn: 0 } }
      }
      for (const mode of ['strict', 'relaxed']) {
        typeCountsMap[type][mode].tp += metrics[mode].tp
        typeCountsMap[type][mode].fp += metrics[mode].fp
        typeCountsMap[type][mode].fn += metrics[mode].fn
      }
    }
  }
  const entityTypeMetrics = {}
  for (const [type, counts] of Object.entries(typeCountsMap)) {
    entityTypeMetrics[type] = {
      strict: { ...counts.strict, ...countsToMetrics(counts.strict) },
      relaxed: { ...counts.relaxed, ...countsToMetrics(counts.relaxed) },
    }
  }

  return { documentResults, corpus: { entities, relations, combined, kappa, entityTypeMetrics } }
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
