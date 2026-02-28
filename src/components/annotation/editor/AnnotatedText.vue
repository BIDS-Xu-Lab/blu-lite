<template>
  <div
    ref="containerRef"
    class="annotation-container"
    @mouseup="onMouseUp"
  >
    <template v-for="block in renderBlocks" :key="block.start">
      <!-- Plain text -->
      <span
        v-if="block.type === 'plain'"
        :data-offset="block.start"
        class="plain-segment"
      >{{ block.text }}</span>

      <!-- Annotated block: inline-flex column with text on top, labels below -->
      <span
        v-else
        class="annotated-block"
      >
        <!-- Text row: render all segments in this block -->
        <span class="annotated-block-text">
          <span
            v-for="seg in block.segments"
            :key="seg.start"
            :data-offset="seg.start"
            :style="segmentStyle(seg)"
            :class="{ 'segment-hovered': isSegmentHovered(seg) }"
            class="annotated-segment"
          >{{ seg.text }}</span>
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

function segmentStyle(segment) {
  if (segment.entities.length === 0) return {}
  // For overlapping entities, use the first entity's color for the background
  const primary = segment.entities[0]
  const color = schemaStore.getEntityColor(primary.entity.semantic)
  return {
    backgroundColor: color.bg,
    borderBottom: `2px solid ${color.border}`,
  }
}

function isSegmentHovered(seg) {
  if (!uiStore.hoveredEntityId) return false
  return seg.entities.some(es => es.entity.id === uiStore.hoveredEntityId)
}
</script>
