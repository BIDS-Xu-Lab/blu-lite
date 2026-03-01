<template>
  <svg
    ref="svgRef"
    v-if="annotationStore.allRelations.length > 0"
    class="relation-overlay"
    :style="{ width: svgSize.width + 'px', height: svgSize.height + 'px' }"
  >
    <defs>
      <marker
        id="relation-arrow"
        viewBox="0 0 10 7"
        refX="10"
        refY="3.5"
        markerWidth="8"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 0 L 10 3.5 L 0 7 z" fill="#9ca3af" />
      </marker>
    </defs>
    <template v-for="curve in curves" :key="curve.id">
      <!-- Right-angle polyline -->
      <polyline
        :points="curve.points"
        fill="none"
        stroke="#9ca3af"
        stroke-width="1.5"
        marker-end="url(#relation-arrow)"
      />
      <!-- Relation label background -->
      <rect
        :x="curve.labelX - curve.labelWidth / 2 - 5"
        :y="curve.labelY - 8"
        :width="curve.labelWidth + 10"
        height="16"
        rx="3"
        fill="white"
        stroke="#d1d5db"
        stroke-width="1"
        class="relation-label-bg"
        @click.stop="handleRelationClick(curve, $event)"
      />
      <!-- Relation label text -->
      <text
        :x="curve.labelX"
        :y="curve.labelY + 4"
        text-anchor="middle"
        class="relation-label-text"
        @click.stop="handleRelationClick(curve, $event)"
      >
        {{ curve.semantic }}
      </text>
    </template>
  </svg>

  <!-- Relation delete popup -->
  <div
    v-if="deletePopup.visible"
    ref="deleteMenuRef"
    class="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
    :style="{ left: deletePopup.x + 'px', top: deletePopup.y + 'px' }"
  >
    <button
      class="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
      @click="confirmDeleteRelation"
    >
      <font-awesome-icon :icon="['fas', 'trash']" class="text-xs" />
      Delete Relation
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useAnnotationStore } from '../../../stores/annotationStore.js'

const props = defineProps({
  scrollContainer: { type: Object, default: null },
})

const annotationStore = useAnnotationStore()

const svgRef = ref(null)
const svgSize = ref({ width: 0, height: 0 })
const positionTick = ref(0)

const deletePopup = ref({ visible: false, x: 0, y: 0, offsetKey: null, relationIndex: -1 })
const deleteMenuRef = ref(null)

const SAME_ROW_THRESHOLD = 40
const ROUTE_GAP = 8

function findEntityLabel(begin, end, semantic) {
  if (!props.scrollContainer) return null
  const labels = props.scrollContainer.querySelectorAll('.entity-label')
  for (const label of labels) {
    const b = parseInt(label.dataset.entityBegin, 10)
    const e = parseInt(label.dataset.entityEnd, 10)
    if (b === begin && e === end) {
      const text = label.textContent.trim().toLowerCase().split('\n')[0].trim()
      if (text.startsWith(semantic.toLowerCase())) {
        return label
      }
    }
  }
  return null
}

const curves = computed(() => {
  // eslint-disable-next-line no-unused-vars
  const _tick = positionTick.value
  const relations = annotationStore.allRelations
  if (relations.length === 0 || !props.scrollContainer) return []

  const containerRect = props.scrollContainer.getBoundingClientRect()
  const scrollTop = props.scrollContainer.scrollTop
  const scrollLeft = props.scrollContainer.scrollLeft
  const result = []

  for (const rel of relations) {
    const fromLabel = findEntityLabel(rel.fromEnt.begin, rel.fromEnt.end, rel.fromEnt.semantic)
    const toLabel = findEntityLabel(rel.toEnt.begin, rel.toEnt.end, rel.toEnt.semantic)
    if (!fromLabel || !toLabel) continue

    const fromRect = fromLabel.getBoundingClientRect()
    const toRect = toLabel.getBoundingClientRect()

    // Positions relative to scroll container content area
    const fromCenterX = fromRect.left - containerRect.left + scrollLeft + fromRect.width / 2
    const fromBottom = fromRect.bottom - containerRect.top + scrollTop
    const fromCenterY = fromRect.top - containerRect.top + scrollTop + fromRect.height / 2

    const toCenterX = toRect.left - containerRect.left + scrollLeft + toRect.width / 2
    const toBottom = toRect.bottom - containerRect.top + scrollTop
    const toTop = toRect.top - containerRect.top + scrollTop
    const toCenterY = toRect.top - containerRect.top + scrollTop + toRect.height / 2

    let points, labelX, labelY
    const sameRow = Math.abs(fromCenterY - toCenterY) < SAME_ROW_THRESHOLD

    if (sameRow) {
      // U-shape below both labels: down → horizontal → up
      const routeY = Math.max(fromBottom, toBottom) + ROUTE_GAP
      points = `${fromCenterX},${fromBottom} ${fromCenterX},${routeY} ${toCenterX},${routeY} ${toCenterX},${toBottom}`
      labelX = (fromCenterX + toCenterX) / 2
      labelY = routeY
    } else if (fromCenterY < toCenterY) {
      // FROM is above TO: down → horizontal → down to TO top
      const midY = (fromBottom + toTop) / 2
      points = `${fromCenterX},${fromBottom} ${fromCenterX},${midY} ${toCenterX},${midY} ${toCenterX},${toTop}`
      labelX = (fromCenterX + toCenterX) / 2
      labelY = midY
    } else {
      // FROM is below TO (unusual): down → horizontal → up
      const routeY = Math.max(fromBottom, toBottom) + ROUTE_GAP
      points = `${fromCenterX},${fromBottom} ${fromCenterX},${routeY} ${toCenterX},${routeY} ${toCenterX},${toBottom}`
      labelX = (fromCenterX + toCenterX) / 2
      labelY = routeY
    }

    const labelWidth = rel.semantic.length * 6.5

    result.push({
      id: rel.id || `${rel._offsetKey}-${rel._relationIndex}`,
      points,
      labelX,
      labelY,
      labelWidth,
      semantic: rel.semantic,
      _offsetKey: rel._offsetKey,
      _relationIndex: rel._relationIndex,
    })
  }

  return result
})

function measureAndUpdate() {
  if (!props.scrollContainer) return

  // Temporarily shrink SVG to 0 so it doesn't inflate scrollWidth/scrollHeight
  if (svgRef.value) {
    svgRef.value.style.width = '0px'
    svgRef.value.style.height = '0px'
  }

  // Force reflow to get true content dimensions
  void props.scrollContainer.offsetHeight

  svgSize.value = {
    width: props.scrollContainer.scrollWidth,
    height: props.scrollContainer.scrollHeight,
  }

  // Restore SVG size (Vue will also set it via :style binding on next tick)
  if (svgRef.value) {
    svgRef.value.style.width = svgSize.value.width + 'px'
    svgRef.value.style.height = svgSize.value.height + 'px'
  }

  positionTick.value++
}

function handleRelationClick(curve, event) {
  deletePopup.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    offsetKey: curve._offsetKey,
    relationIndex: curve._relationIndex,
  }
}

function confirmDeleteRelation() {
  const { offsetKey, relationIndex } = deletePopup.value
  if (offsetKey !== null && relationIndex >= 0) {
    annotationStore.deleteRelation(offsetKey, relationIndex)
  }
  deletePopup.value = { visible: false, x: 0, y: 0, offsetKey: null, relationIndex: -1 }
}

function handleGlobalClick(event) {
  if (deletePopup.value.visible && deleteMenuRef.value && !deleteMenuRef.value.contains(event.target)) {
    deletePopup.value.visible = false
  }
}

let resizeObserver = null

function onScroll() {
  positionTick.value++
}

function onResize() {
  nextTick(measureAndUpdate)
}

// Watch for annotation changes to re-render
watch(
  () => annotationStore.allRelations,
  () => nextTick(measureAndUpdate),
  { deep: true },
)

watch(
  () => annotationStore.allEntities,
  () => nextTick(measureAndUpdate),
  { deep: true },
)

watch(
  () => props.scrollContainer,
  (container, oldContainer) => {
    if (oldContainer) {
      oldContainer.removeEventListener('scroll', onScroll)
      resizeObserver?.disconnect()
    }
    if (container) {
      container.addEventListener('scroll', onScroll)
      resizeObserver = new ResizeObserver(onResize)
      resizeObserver.observe(container)
      nextTick(measureAndUpdate)
    }
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('mousedown', handleGlobalClick)
  nextTick(measureAndUpdate)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('mousedown', handleGlobalClick)
  if (props.scrollContainer) {
    props.scrollContainer.removeEventListener('scroll', onScroll)
  }
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.relation-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}

.relation-label-bg {
  pointer-events: auto;
  cursor: pointer;
}

.relation-label-bg:hover {
  fill: #f9fafb;
  stroke: #9ca3af;
}

.relation-label-text {
  font-size: 0.6rem;
  font-weight: 600;
  fill: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  pointer-events: auto;
  cursor: pointer;
}

.relation-label-text:hover {
  fill: #374151;
}
</style>
