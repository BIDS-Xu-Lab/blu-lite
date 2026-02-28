<template>
  <span
    class="entity-label"
    :style="labelStyle"
    @click.stop="handleClick"
    @mouseenter="uiStore.setHoveredEntityId(entity.id)"
    @mouseleave="uiStore.setHoveredEntityId(null)"
    :title="entity.semantic + (uiStore.showAnnotationId ? ' [' + entity.id + ']' : '')"
  >
    {{ entity.semantic }}
    <span v-if="uiStore.showAnnotationId" class="opacity-60 ml-0.5">#{{ entity.id }}</span>
    <template v-if="uiStore.showAttributes && hasAttrs">
      <span
        v-for="(attr, key) in entity.attrs"
        :key="key"
        class="entity-attr"
      >
        {{ key }}: {{ attr.attrValue || '-' }}
      </span>
    </template>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useUiStore } from '../../../stores/uiStore.js'
import { useAnnotationStore } from '../../../stores/annotationStore.js'

const props = defineProps({
  entity: { type: Object, required: true },
  offsetKey: { type: String, required: true },
  entityIndex: { type: Number, required: true },
  color: { type: Object, required: true },
})

const uiStore = useUiStore()
const annotationStore = useAnnotationStore()

const labelStyle = computed(() => ({
  backgroundColor: props.color.bg,
  color: props.color.text,
  border: `1px solid ${props.color.border}`,
}))

const hasAttrs = computed(() => {
  return props.entity.attrs && Object.keys(props.entity.attrs).length > 0
})

function handleClick(event) {
  annotationStore.setEditingEntity(props.offsetKey, props.entityIndex)

  // Dispatch a custom event for the context menu
  const customEvent = new CustomEvent('entity-click', {
    detail: {
      offsetKey: props.offsetKey,
      entityIndex: props.entityIndex,
      x: event.clientX,
      y: event.clientY,
    },
    bubbles: true,
  })
  event.target.dispatchEvent(customEvent)
}
</script>
