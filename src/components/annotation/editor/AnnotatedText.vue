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
        v-else
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
              :class="{ 'segment-hovered': isSegmentHovered(seg) }"
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFileStore } from '../../../stores/fileStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useUiStore } from '../../../stores/uiStore.js'
import { useTextRenderer } from '../../../composables/useTextRenderer.js'
import { useAnnotation } from '../../../composables/useAnnotation.js'
import EntityLabel from './EntityLabel.vue'

const fileStore = useFileStore()
const schemaStore = useSchemaStore()
const uiStore = useUiStore()

const containerRef = ref(null)

const content = computed(() => fileStore.activeFile?.content ?? '')
const indexes = computed(() => fileStore.activeFile?.indexes ?? {})

const { renderBlocks } = useTextRenderer(content, indexes)
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

function isSegmentHovered(seg) {
  if (!uiStore.hoveredEntityId) return false
  return seg.entities.some(es => es.entity.id === uiStore.hoveredEntityId)
}
</script>
