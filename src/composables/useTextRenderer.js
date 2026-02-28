import { computed } from 'vue'

export function useTextRenderer(content, indexes) {
  // Flat segments split at every entity boundary
  const segments = computed(() => {
    if (!content.value) return []

    const boundaries = new Set([0, content.value.length])
    const entitySpans = []

    for (const [offsetKey, indexData] of Object.entries(indexes.value || {})) {
      if (!indexData.Entity) continue
      for (let ei = 0; ei < indexData.Entity.length; ei++) {
        const entity = indexData.Entity[ei]
        boundaries.add(entity.begin)
        boundaries.add(entity.end)
        entitySpans.push({
          begin: entity.begin,
          end: entity.end,
          entity,
          offsetKey,
          entityIndex: ei,
        })
      }
    }

    const sorted = [...boundaries].sort((a, b) => a - b)
    const result = []

    for (let i = 0; i < sorted.length - 1; i++) {
      const start = sorted[i]
      const end = sorted[i + 1]
      const text = content.value.slice(start, end)

      const covering = entitySpans.filter(
        (span) => span.begin <= start && span.end >= end,
      )

      result.push({ text, start, end, entities: covering })
    }

    return result
  })

  // Merge segments into "render blocks": plain text or annotated blocks
  // An annotated block wraps consecutive annotated segments and lists all entities
  const renderBlocks = computed(() => {
    const segs = segments.value
    if (segs.length === 0) return []

    const blocks = []
    let i = 0

    while (i < segs.length) {
      const seg = segs[i]

      if (seg.entities.length === 0) {
        // Plain text block
        blocks.push({
          type: 'plain',
          text: seg.text,
          start: seg.start,
          end: seg.end,
        })
        i++
      } else {
        // Start of an annotated block — collect consecutive annotated segments
        // that share a merged entity range
        const blockSegments = [seg]
        const entitySet = new Set(seg.entities.map((e) => e.entity.id || `${e.offsetKey}-${e.entityIndex}`))
        let blockEnd = seg.end

        // Expand while next segment is also annotated and overlaps with current block entities
        let j = i + 1
        while (j < segs.length && segs[j].entities.length > 0) {
          // Check if this segment is within any entity that started in our block
          const nextSeg = segs[j]
          let connected = false
          for (const es of nextSeg.entities) {
            const eid = es.entity.id || `${es.offsetKey}-${es.entityIndex}`
            if (entitySet.has(eid)) {
              connected = true
              break
            }
          }
          if (!connected) {
            // Check if any entity from nextSeg also covers segments already in block
            for (const es of nextSeg.entities) {
              if (es.begin < nextSeg.start) {
                // This entity started before this segment, check if it overlaps block
                if (es.begin < blockEnd && es.end > segs[i].start) {
                  connected = true
                  break
                }
              }
            }
          }

          if (connected) {
            blockSegments.push(nextSeg)
            for (const es of nextSeg.entities) {
              entitySet.add(es.entity.id || `${es.offsetKey}-${es.entityIndex}`)
            }
            blockEnd = Math.max(blockEnd, nextSeg.end)
            j++
          } else {
            break
          }
        }

        // Collect all unique entities in this block
        const allEntitiesMap = new Map()
        for (const bs of blockSegments) {
          for (const es of bs.entities) {
            const eid = es.entity.id || `${es.offsetKey}-${es.entityIndex}`
            if (!allEntitiesMap.has(eid)) {
              allEntitiesMap.set(eid, es)
            }
          }
        }

        blocks.push({
          type: 'annotated',
          start: blockSegments[0].start,
          end: blockSegments[blockSegments.length - 1].end,
          segments: blockSegments,
          entities: [...allEntitiesMap.values()],
        })

        i = j
      }
    }

    return blocks
  })

  return { segments, renderBlocks }
}
