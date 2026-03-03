<template>
  <div
    ref="containerRef"
    class="annotation-container"
    @mouseup="onMouseUp"
  >
    <template v-for="block in renderBlocks" :key="block.start">
      <!-- Plain text -->
      <template v-if="block.type === 'plain'">
        <span
          v-for="part in splitWithHighlight(block.text, block.start)"
          :key="part.offset"
          :data-offset="part.offset"
          :class="['plain-segment', { 'search-highlight': part.highlighted }]"
        >{{ part.text }}</span>
      </template>

      <!-- Annotated block: inline-flex column with text on top, labels below -->
      <span
        v-else-if="block.type === 'annotated'"
        class="annotated-block"
      >
        <!-- Text row: render all segments in this block -->
        <span class="annotated-block-text">
          <template v-for="seg in block.segments" :key="seg.start">
            <span
              v-for="part in splitWithHighlight(seg.text, seg.start)"
              :key="part.offset"
              :data-offset="part.offset"
              :style="partAnnotatedStyle(seg, part.highlighted)"
              :class="{ 'segment-hovered': isSegmentHovered(seg), 'concept-mapping-blink': isSegmentConceptMapping(seg) }"
              class="annotated-segment"
            >{{ part.text }}</span>
          </template>
        </span>

        <!-- Entity labels row: ALL entities in this block, stacked below -->
        <span class="annotated-block-labels">
          <EntityLabel
            v-for="es in block.entities"
            :key="es.entity.id || (es.offsetKey + '-' + es.entityIndex)"
            :entity="es.entity"
            :offset-key="es.offsetKey"
            :entity-index="es.entityIndex"
            :color="schemaStore.getEntityColor(es.entity.semantic)"
          />
        </span>
      </span>

      <!-- Candidate block: dotted styling for auto-annotation candidates -->
      <span
        v-else-if="block.type === 'candidate'"
        class="candidate-block"
      >
        <span class="candidate-block-text">
          <template v-for="seg in block.segments" :key="seg.start">
            <span
              v-for="part in splitWithHighlight(seg.text, seg.start)"
              :key="part.offset"
              :data-offset="part.offset"
              :style="candidateSegmentStyle(seg)"
              class="candidate-segment"
            >{{ part.text }}</span>
          </template>
        </span>

        <span class="candidate-block-labels">
          <CandidateLabel
            v-for="candidate in block.candidates"
            :key="candidate.id"
            :candidate="candidate"
            :color="schemaStore.getEntityColor(candidate.semantic)"
          />
        </span>
      </span>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFileStore } from '../../../stores/fileStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useUiStore } from '../../../stores/uiStore.js'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import { useCandidateStore } from '../../../stores/candidateStore.js'
import { useTextRenderer } from '../../../composables/useTextRenderer.js'
import { useAnnotation } from '../../../composables/useAnnotation.js'
import EntityLabel from './EntityLabel.vue'
import CandidateLabel from './CandidateLabel.vue'

const fileStore = useFileStore()
const schemaStore = useSchemaStore()
const uiStore = useUiStore()
const annotationStore = useAnnotationStore()
const candidateStore = useCandidateStore()

const containerRef = ref(null)

const content = computed(() => fileStore.activeFile?.content ?? '')
const indexes = computed(() => fileStore.activeFile?.indexes ?? {})
const candidatesForRenderer = computed(() =>
  candidateStore.isActive ? candidateStore.candidates : [],
)

const { renderBlocks } = useTextRenderer(content, indexes, candidatesForRenderer)
const { onMouseUp } = useAnnotation()

function splitWithHighlight(text, baseOffset) {
  const query = uiStore.searchQuery
  if (!query) return [{ text, offset: baseOffset, highlighted: false }]
  const parts = []
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escaped, 'gi')
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), offset: baseOffset + lastIndex, highlighted: false })
    }
    parts.push({ text: match[0], offset: baseOffset + match.index, highlighted: true })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), offset: baseOffset + lastIndex, highlighted: false })
  }
  return parts.length > 0 ? parts : [{ text, offset: baseOffset, highlighted: false }]
}

function segmentStyle(segment) {
  if (segment.entities.length === 0) return {}
  const primary = segment.entities[0]
  const color = schemaStore.getEntityColor(primary.entity.semantic)
  return {
    backgroundColor: color.bg,
    borderBottom: `2px solid ${color.border}`,
  }
}

function partAnnotatedStyle(seg, highlighted) {
  const base = segmentStyle(seg)
  if (highlighted) {
    return { ...base, backgroundColor: '#fde047', borderBottom: '2px solid #ca8a04' }
  }
  return base
}

function candidateSegmentStyle(seg) {
  if (seg.candidates.length === 0) return {}
  const primary = seg.candidates[0]
  const color = schemaStore.getEntityColor(primary.candidate.semantic)
  return {
    borderBottom: `2px dotted ${color.border}`,
  }
}

function isSegmentHovered(seg) {
  const hasHoveredId = !!uiStore.hoveredEntityId
  const hasHoveredKeys = uiStore.hoveredEntityKeys.length > 0
  if (!hasHoveredId && !hasHoveredKeys) return false

  return seg.entities.some((es) => {
    if (hasHoveredId && es.entity.id === uiStore.hoveredEntityId) return true
    if (!hasHoveredKeys) return false
    const key = `${es.entity.begin}-${es.entity.end}-${es.entity.semantic}`
    return uiStore.hoveredEntityKeys.includes(key)
  })
}

function isSegmentConceptMapping(seg) {
  const target = annotationStore.conceptMappingTarget
  if (!target || !annotationStore.showConceptMapping || target.type !== 'entity') return false
  return seg.entities.some(
    es =>
      es.entity.begin === target.annotation.begin &&
      es.entity.end === target.annotation.end &&
      es.entity.semantic === target.annotation.semantic,
  )
}
</script>
