<template>
  <div
    ref="containerRef"
    class="annotation-container"
    @mouseup="onMouseUp"
  >
    <template v-for="segment in segments" :key="segment.start">
      <!-- Annotated text segment -->
      <span
        v-if="segment.entities.length > 0"
        :data-offset="segment.start"
        :style="segmentStyle(segment)"
        class="annotated-segment"
      >{{ segment.text }}</span>
      <!-- Plain text segment -->
      <span
        v-else
        :data-offset="segment.start"
        class="plain-segment"
      >{{ segment.text }}</span>
      <!-- Entity labels rendered right after the LAST segment of each entity -->
      <template v-for="es in segment.entityEnds" :key="'lbl-' + (es.entity.id || es.offsetKey + '-' + es.entityIndex)">
        <span class="entity-label-inline">
          <EntityLabel
            :entity="es.entity"
            :offset-key="es.offsetKey"
            :entity-index="es.entityIndex"
            :color="schemaStore.getEntityColor(es.entity.semantic)"
          />
        </span>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFileStore } from '../../../stores/fileStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useTextRenderer } from '../../../composables/useTextRenderer.js'
import { useAnnotation } from '../../../composables/useAnnotation.js'
import EntityLabel from './EntityLabel.vue'

const fileStore = useFileStore()
const schemaStore = useSchemaStore()

const containerRef = ref(null)

const content = computed(() => fileStore.activeFile?.content ?? '')
const indexes = computed(() => fileStore.activeFile?.indexes ?? {})

const { segments } = useTextRenderer(content, indexes)
const { onMouseUp } = useAnnotation()

function segmentStyle(segment) {
  if (segment.entities.length === 0) return {}
  const primary = segment.entities[0]
  const color = schemaStore.getEntityColor(primary.entity.semantic)
  return {
    backgroundColor: color.bg,
    borderBottom: `2px solid ${color.border}`,
  }
}
</script>

<style scoped>
.entity-label-inline {
  display: inline;
  position: relative;
  line-height: 2.6;
}
</style>
