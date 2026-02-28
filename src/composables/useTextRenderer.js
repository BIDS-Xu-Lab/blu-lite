import { computed } from 'vue'

export function useTextRenderer(content, indexes) {
  const segments = computed(() => {
    if (!content.value) return []

    const boundaries = new Set([0, content.value.length])
    const entitySpans = []

    for (const [offsetKey, indexData] of Object.entries(indexes.value || {})) {
      if (!indexData.Entity) continue
      for (let ei = 0; ei < indexData.Entity.length; ei++) {
        const entity = indexData.Entity[ei]
        const begin = entity.begin
        const end = entity.end
        boundaries.add(begin)
        boundaries.add(end)
        entitySpans.push({
          begin,
          end,
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

      const startsHere = covering.filter((span) => span.begin === start)
      const endsHere = entitySpans.filter((span) => span.end === end)

      result.push({
        text,
        start,
        end,
        entities: covering,
        entityStarts: startsHere,
        entityEnds: endsHere,
      })
    }

    return result
  })

  return { segments }
}
