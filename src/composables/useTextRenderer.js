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
          lane: 0,
        })
      }
    }

    // Give each entity a fixed underline lane so its bar stays on the same row
    // across every segment it covers. Greedy interval coloring: outer (longer)
    // spans claim the upper lanes, nested spans stack below them.
    entitySpans.sort((a, b) => a.begin - b.begin || b.end - a.end)
    const laneEnds = []
    for (const span of entitySpans) {
      let lane = laneEnds.findIndex((end) => end <= span.begin)
      if (lane === -1) lane = laneEnds.length
      laneEnds[lane] = span.end
      span.lane = lane
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
        // lanes: underline bars indexed by entity lane; null keeps an empty row
        //   so bars of the same entity line up across neighbouring segments.
        // innermost: the shortest covering entity, used for the background so
        //   nested spans stand out from the span that contains them.
        const labelEntities = seg.entities.filter(
          (es) => es.entity.begin === seg.start,
        )
        const lanes = []
        let innermost = seg.entities[0]
        for (const es of seg.entities) {
          lanes[es.lane] = es
          if (es.end - es.begin < innermost.end - innermost.begin) innermost = es
        }
        blocks.push({
          type: 'annotated',
          start: seg.start,
          end: seg.end,
          text: seg.text,
          entities: seg.entities,
          lanes: Array.from(lanes, (es) => es ?? null),
          innermost,
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
