<template>
  <span
    class="entity-label"
    :class="{
      'relation-target-blink': isRelationTarget,
      'relation-from-highlight': isRelationFrom,
      'relation-mode-dimmed': isRelationModeDimmed,
      'relation-connected': isInRelation,
      'concept-mapping-blink': isConceptMappingTarget,
    }"
    :style="labelStyle"
    :data-entity-id="entity.id"
    :data-entity-begin="entity.begin"
    :data-entity-end="entity.end"
    @click.stop="handleClick"
    @mouseenter="uiStore.setHoveredEntityId(entity.id)"
    @mouseleave="uiStore.setHoveredEntityId(null)"
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

const isRelationTarget = computed(() => {
  if (!annotationStore.relationMode || !annotationStore.pendingRelation) return false
  return annotationStore.isPendingRelationTarget(props.entity)
})

const isRelationFrom = computed(() => {
  if (!annotationStore.relationMode || !annotationStore.pendingRelation) return false
  const fromEnt = annotationStore.pendingRelation.fromEntity
  return props.entity.begin === fromEnt.begin && props.entity.end === fromEnt.end && props.entity.semantic === fromEnt.semantic
})

const isInRelation = computed(() => {
  return annotationStore.isEntityInRelation(props.entity)
})

const isRelationModeDimmed = computed(() => {
  if (!annotationStore.relationMode) return false
  return !isRelationTarget.value && !isRelationFrom.value
})

const isConceptMappingTarget = computed(() => {
  const target = annotationStore.conceptMappingTarget
  if (!target || !annotationStore.showConceptMapping) return false
  if (target.type !== 'entity') return false
  return (
    target.annotation.begin === props.entity.begin &&
    target.annotation.end === props.entity.end &&
    target.annotation.semantic === props.entity.semantic
  )
})

function handleClick(event) {
  // In relation mode, clicking a valid target creates the relation
  if (annotationStore.relationMode) {
    if (isRelationTarget.value) {
      annotationStore.createRelation(props.entity)
    }
    return
  }

  // Normal mode: open context menu
  annotationStore.setEditingEntity(props.offsetKey, props.entityIndex)

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
