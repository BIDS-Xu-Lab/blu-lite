import { computed, ref } from 'vue'

export function useTextRenderer(content, indexes, candidates = ref([])) {
  // Flat segments split at every entity and candidate boundary
  const segments = computed(() => {
    if (!content.value) return []

    const boundaries = new Set([0, content.value.length])
    const entitySpans = []
    const candidateSpans = []

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

    for (const candidate of candidates.value || []) {
      boundaries.add(candidate.begin)
      boundaries.add(candidate.end)
      candidateSpans.push({
        begin: candidate.begin,
        end: candidate.end,
        candidate,
      })
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

      const coveringCandidates = candidateSpans.filter(
        (span) => span.begin <= start && span.end >= end,
      )

      result.push({ text, start, end, entities: covering, candidates: coveringCandidates })
    }

    return result
  })

  // Merge segments into "render blocks": plain text, annotated blocks, or candidate blocks
  const renderBlocks = computed(() => {
    const segs = segments.value
    if (segs.length === 0) return []

    const blocks = []
    let i = 0

    while (i < segs.length) {
      const seg = segs[i]

      if (seg.entities.length === 0 && seg.candidates.length === 0) {
        // Plain text block
        blocks.push({
          type: 'plain',
          text: seg.text,
          start: seg.start,
          end: seg.end,
        })
        i++
      } else if (seg.entities.length > 0) {
        // Each annotated segment is its own block.
        // labelEntities: only entities whose begin == seg.start (anchored here).
        // entities: all entities covering this segment (for underline bars).
        const labelEntities = seg.entities.filter(
          (es) => es.entity.begin === seg.start,
        )
        blocks.push({
          type: 'annotated',
          start: seg.start,
          end: seg.end,
          text: seg.text,
          entities: seg.entities,
          labelEntities,
        })
        i++
      } else {
        // Candidate block: seg.candidates.length > 0, no entities
        const blockSegments = [seg]
        const candidateSet = new Set(seg.candidates.map((c) => c.candidate.id))

        let j = i + 1
        while (j < segs.length && segs[j].entities.length === 0 && segs[j].candidates.length > 0) {
          const nextSeg = segs[j]
          let connected = false
          for (const cs of nextSeg.candidates) {
            if (candidateSet.has(cs.candidate.id)) {
              connected = true
              break
            }
          }
          if (!connected) break
          blockSegments.push(nextSeg)
          for (const cs of nextSeg.candidates) {
            candidateSet.add(cs.candidate.id)
          }
          j++
        }

        const allCandidatesMap = new Map()
        for (const bs of blockSegments) {
          for (const cs of bs.candidates) {
            if (!allCandidatesMap.has(cs.candidate.id)) {
              allCandidatesMap.set(cs.candidate.id, cs.candidate)
            }
          }
        }

        blocks.push({
          type: 'candidate',
          start: blockSegments[0].start,
          end: blockSegments[blockSegments.length - 1].end,
          segments: blockSegments,
          candidates: [...allCandidatesMap.values()],
        })

        i = j
      }
    }

    return blocks
  })

  return { segments, renderBlocks }
}
