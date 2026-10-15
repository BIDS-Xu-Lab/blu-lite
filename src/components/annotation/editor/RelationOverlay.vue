<template>
  <!-- Line layer: drawn behind the text so cross-line routes never cover words -->
  <svg
    ref="lineSvgRef"
    v-if="annotationStore.allRelations.length > 0"
    class="relation-overlay relation-line-layer"
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
    <polyline
      v-for="curve in curves"
      :key="curve.id"
      :points="curve.points"
      fill="none"
      stroke="#9ca3af"
      stroke-width="2"
      marker-end="url(#relation-arrow)"
    />
  </svg>

  <!-- Label layer: above the text, in the space reserved under each line -->
  <svg
    ref="labelSvgRef"
    v-if="annotationStore.allRelations.length > 0"
    class="relation-overlay relation-label-layer"
    :style="{ width: svgSize.width + 'px', height: svgSize.height + 'px' }"
  >
    <g
      v-for="curve in curves"
      :key="curve.id"
      @mouseenter="handleRelationHover(curve)"
      @mouseleave="clearRelationHover"
      @click.stop="handleRelationClick(curve, $event)"
    >
      <!-- Relation label background -->
      <rect
        :x="curve.labelX - curve.labelWidth / 2 - 5"
        :y="curve.conceptText ? curve.labelY - 14 : curve.labelY - 8"
        :width="curve.labelWidth + 10"
        :height="curve.conceptText ? 28 : 16"
        rx="3"
        fill="white"
        stroke="#d1d5db"
        stroke-width="1"
        class="relation-label-bg"
      />
      <!-- Relation label text -->
      <text
        :x="curve.labelX"
        :y="curve.conceptText ? curve.labelY : curve.labelY + 4"
        text-anchor="middle"
        class="relation-label-text"
      >
        {{ curve.semantic }}
      </text>
      <!-- Concept text below label name -->
      <text
        v-if="curve.conceptText"
        :x="curve.labelX"
        :y="curve.labelY + 12"
        text-anchor="middle"
        class="relation-concept-text"
      >
        {{ curve.conceptText }}
      </text>
    </g>
  </svg>

  <!-- Relation context popup -->
  <div
    v-if="deletePopup.visible"
    ref="deleteMenuRef"
    class="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
    :style="{ left: deletePopup.x + 'px', top: deletePopup.y + 'px' }"
  >
    <button
      class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
      @click="openRelationConceptMapping"
    >
      <font-awesome-icon :icon="['fas', 'book-medical']" class="text-xs text-gray-400" />
      <template v-if="popupRelationConcept">
        Edit {{ popupRelationConcept }}
      </template>
      <template v-else>
        Concept Mapping
      </template>
    </button>
    <div class="border-t border-gray-100 my-0.5"></div>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import { useFileStore } from '../../../stores/fileStore.js'
import { useUiStore } from '../../../stores/uiStore.js'

const props = defineProps({
  scrollContainer: { type: Object, default: null },
})

const annotationStore = useAnnotationStore()
const fileStore = useFileStore()
const uiStore = useUiStore()

const popupRelationConcept = computed(() => {
  if (!deletePopup.value.visible) return null
  const { offsetKey, relationIndex } = deletePopup.value
  const rel = fileStore.activeFile?.indexes?.[offsetKey]?.Relation?.[relationIndex]
  if (!rel?.attrs?.concept?.attrValue) return null
  const conceptId = rel.attrs.concept.attrValue
  const vocab = rel.attrs.vocabulary?.attrValue || ''
  return `${conceptId}(${vocab})`
})

function openRelationConceptMapping() {
  const { offsetKey, relationIndex, x, y } = deletePopup.value
  deletePopup.value.visible = false
  annotationStore.openConceptMapping('relation', offsetKey, relationIndex, { x, y })
}

const lineSvgRef = ref(null)
const labelSvgRef = ref(null)
const svgSize = ref({ width: 0, height: 0 })
const curves = ref([])

const deletePopup = ref({ visible: false, x: 0, y: 0, offsetKey: null, relationIndex: -1 })
const deleteMenuRef = ref(null)

// Route geometry (px). Every route leaves its FROM label downward, runs along a
// horizontal "track" in the space reserved under a text line, and rises into
// its TO label. Tracks are stacked so routes and their labels never overlap.
const ENDPOINT_SPACING = 8   // max gap between routes leaving/entering one label
const BAND_TOP_GAP = 6       // gap between a line's lowest label and its first track
const BAND_BOTTOM_GAP = 6    // gap between the last track and the next text line
const TRACK_GAP = 4          // gap between neighbouring tracks
const TRACK_PAD_X = 4        // horizontal clearance between routes sharing a track
const LABEL_HEIGHT = 16
const LABEL_HEIGHT_CONCEPT = 28

// Blocks padded to reserve route space; reset at the start of every layout
const paddedBlocks = new Set()

function entityKey(entity) {
  if (!entity) return ''
  return `${entity.begin}-${entity.end}-${entity.semantic}`
}

function handleRelationHover(curve) {
  uiStore.setHoveredEntityKeys([curve.fromEntityKey, curve.toEntityKey].filter(Boolean))
}

function clearRelationHover() {
  uiStore.setHoveredEntityKeys([])
}

function clearReservedSpace() {
  for (const block of paddedBlocks) block.style.paddingBottom = ''
  paddedBlocks.clear()
}

function layoutRoutes() {
  const container = props.scrollContainer
  clearReservedSpace()
  const relations = annotationStore.allRelations
  if (!container || relations.length === 0) return []

  // Converts viewport rects into the scroll container's content coordinates
  const originOf = () => {
    const rect = container.getBoundingClientRect()
    return { x: rect.left - container.scrollLeft, y: rect.top - container.scrollTop }
  }
  let origin = originOf()

  const labelByKey = new Map()
  for (const label of container.querySelectorAll('.entity-label')) {
    const { entityBegin, entityEnd, entitySemantic } = label.dataset
    const key = `${entityBegin}-${entityEnd}-${entitySemantic}`
    if (!labelByKey.has(key)) labelByKey.set(key, label)
  }

  // Pass 1: group blocks into visual lines. Blocks are top-aligned inline-flex
  // boxes, so every block on a line shares its top edge.
  const lines = []
  const lineOfBlock = new Map()
  for (const block of container.querySelectorAll('.annotated-block, .candidate-block')) {
    const rect = block.getBoundingClientRect()
    const top = rect.top - origin.y
    let line = lines[lines.length - 1]
    if (!line || Math.abs(line.top - top) > 1) {
      line = { top, bottom: -Infinity, tallest: null, routes: [], tracks: [], reserve: 0 }
      lines.push(line)
    }
    if (rect.bottom - origin.y > line.bottom) {
      line.bottom = rect.bottom - origin.y
      line.tallest = block
    }
    lineOfBlock.set(block, line)
  }

  const routes = []
  for (const rel of relations) {
    const fromLabel = labelByKey.get(entityKey(rel.fromEnt))
    const toLabel = labelByKey.get(entityKey(rel.toEnt))
    if (!fromLabel || !toLabel) continue
    const fromLine = lineOfBlock.get(fromLabel.closest('.annotated-block'))
    const toLine = lineOfBlock.get(toLabel.closest('.annotated-block'))
    if (!fromLine || !toLine) continue

    const fromRect = fromLabel.getBoundingClientRect()
    const toRect = toLabel.getBoundingClientRect()
    const conceptText = rel.attrs?.concept?.attrValue || null
    const labelWidth = Math.max(
      rel.semantic.length * 6.5,
      conceptText ? conceptText.length * 5 : 0,
    )
    // Horizontal extent the route can occupy on its track: both labels plus the
    // relation label, which is centered between wherever the endpoints land.
    const half = labelWidth / 2 + 5
    const left = Math.min(fromRect.left, toRect.left, (fromRect.left + toRect.left) / 2 - half)
    const right = Math.max(fromRect.right, toRect.right, (fromRect.right + toRect.right) / 2 + half)

    routes.push({
      rel,
      fromLabel,
      toLabel,
      conceptText,
      labelWidth,
      // The horizontal run goes under the lower of the two lines
      band: fromLine.top >= toLine.top ? fromLine : toLine,
      left: left - origin.x,
      right: right - origin.x,
      track: 0,
    })
  }

  // Pass 2: pack each line's routes into tracks, shortest first, so nested
  // routes sit inside the ones that span them. A route takes the shallowest
  // track whose existing routes it doesn't horizontally overlap.
  for (const route of routes) route.band.routes.push(route)
  for (const line of lines) {
    if (line.routes.length === 0) continue
    line.routes.sort((a, b) => (a.right - a.left) - (b.right - b.left) || a.left - b.left)
    for (const route of line.routes) {
      let t = line.tracks.findIndex((track) => track.spans.every(
        ([l, r]) => route.right + TRACK_PAD_X <= l || route.left - TRACK_PAD_X >= r,
      ))
      if (t === -1) {
        t = line.tracks.length
        line.tracks.push({ spans: [], height: 0 })
      }
      const track = line.tracks[t]
      track.spans.push([route.left, route.right])
      track.height = Math.max(track.height, route.conceptText ? LABEL_HEIGHT_CONCEPT : LABEL_HEIGHT)
      route.track = t
    }
    line.reserve = BAND_TOP_GAP + BAND_BOTTOM_GAP
      + line.tracks.reduce((sum, track) => sum + track.height, 0)
      + TRACK_GAP * (line.tracks.length - 1)
    // Padding the tallest block grows the whole line box by exactly this much
    line.tallest.style.paddingBottom = `${line.reserve}px`
    paddedBlocks.add(line.tallest)
  }

  // Pass 3: re-measure now that the reserved space has pushed lines down
  // (horizontal positions are unchanged, only vertical ones move).
  origin = originOf()
  for (const line of lines) {
    if (line.routes.length === 0) continue
    let y = line.tallest.getBoundingClientRect().bottom - origin.y - line.reserve + BAND_TOP_GAP
    line.trackY = line.tracks.map((track) => {
      const center = y + track.height / 2
      y += track.height + TRACK_GAP
      return center
    })
  }

  // Spread routes that share a label across its width. Routes heading left sit
  // on the left half, routes heading right on the right half, and deeper routes
  // sit outside shallower ones so the vertical runs don't cross.
  const endpointsByLabel = new Map()
  const addEndpoint = (label, route, side) => {
    if (!endpointsByLabel.has(label)) endpointsByLabel.set(label, [])
    endpointsByLabel.get(label).push({ route, side })
  }
  for (const route of routes) {
    route.trackY = route.band.trackY[route.track]
    addEndpoint(route.fromLabel, route, 'from')
    addEndpoint(route.toLabel, route, 'to')
  }
  for (const [label, endpoints] of endpointsByLabel) {
    const rect = label.getBoundingClientRect()
    const centerX = rect.left - origin.x + rect.width / 2
    const otherCenterX = ({ route, side }) => {
      const other = (side === 'from' ? route.toLabel : route.fromLabel).getBoundingClientRect()
      return other.left - origin.x + other.width / 2
    }
    for (const ep of endpoints) ep.headsLeft = otherCenterX(ep) < centerX - 1
    endpoints.sort((a, b) => {
      if (a.headsLeft !== b.headsLeft) return a.headsLeft ? -1 : 1
      return a.headsLeft ? a.route.trackY - b.route.trackY : b.route.trackY - a.route.trackY
    })
    const spacing = endpoints.length > 1
      ? Math.min(ENDPOINT_SPACING, Math.max(0, rect.width - 8) / (endpoints.length - 1))
      : 0
    endpoints.forEach(({ route, side }, i) => {
      route[`${side}X`] = centerX + (i - (endpoints.length - 1) / 2) * spacing
      route[`${side}Y`] = rect.bottom - origin.y
    })
  }

  return routes.map((route) => ({
    id: route.rel.id || `${route.rel._offsetKey}-${route.rel._relationIndex}`,
    points: `${route.fromX},${route.fromY} ${route.fromX},${route.trackY} ${route.toX},${route.trackY} ${route.toX},${route.toY}`,
    labelX: (route.fromX + route.toX) / 2,
    labelY: route.trackY,
    labelWidth: route.labelWidth,
    semantic: route.rel.semantic,
    conceptText: route.conceptText,
    fromEntityKey: entityKey(route.rel.fromEnt),
    toEntityKey: entityKey(route.rel.toEnt),
    _offsetKey: route.rel._offsetKey,
    _relationIndex: route.rel._relationIndex,
  }))
}

function measureAndUpdate() {
  if (!props.scrollContainer) return

  // Temporarily shrink the SVGs to 0 so they don't inflate scrollWidth/scrollHeight
  const svgs = [lineSvgRef.value, labelSvgRef.value].filter(Boolean)
  for (const svg of svgs) {
    svg.style.width = '0px'
    svg.style.height = '0px'
  }

  curves.value = layoutRoutes()

  svgSize.value = {
    width: props.scrollContainer.scrollWidth,
    height: props.scrollContainer.scrollHeight,
  }

  // Restore SVG size (Vue will also set it via :style binding on next tick)
  for (const svg of svgs) {
    svg.style.width = svgSize.value.width + 'px'
    svg.style.height = svgSize.value.height + 'px'
  }
}

// Coalesce layout requests into one per frame, after Vue has patched the DOM
let layoutFrame = 0
function scheduleLayout() {
  if (layoutFrame) return
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0
    measureAndUpdate()
  })
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

// Re-layout when annotations change, the text reflows (container width or
// content size), or label sizes change through the display toggles.
watch(
  () => [annotationStore.allRelations, annotationStore.allEntities],
  scheduleLayout,
  { deep: true },
)

watch(
  () => [uiStore.showAttributes, uiStore.showAnnotationId],
  scheduleLayout,
)

watch(
  () => props.scrollContainer,
  (container) => {
    resizeObserver?.disconnect()
    resizeObserver = null
    if (container) {
      resizeObserver = new ResizeObserver(scheduleLayout)
      resizeObserver.observe(container)
      const content = container.querySelector('.annotation-container')
      if (content) resizeObserver.observe(content)
      scheduleLayout()
    }
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', scheduleLayout)
  document.addEventListener('mousedown', handleGlobalClick)
  document.fonts?.ready.then(scheduleLayout)
  scheduleLayout()
})

onUnmounted(() => {
  clearRelationHover()
  window.removeEventListener('resize', scheduleLayout)
  document.removeEventListener('mousedown', handleGlobalClick)
  resizeObserver?.disconnect()
  cancelAnimationFrame(layoutFrame)
  clearReservedSpace()
})
</script>

<style scoped>
.relation-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

/* Lines pass behind the text (.annotation-container is z-index 1) */
.relation-line-layer {
  z-index: 0;
}

.relation-label-layer {
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

.relation-concept-text {
  font-size: 0.55rem;
  fill: #9ca3af;
  pointer-events: auto;
  cursor: pointer;
}

.relation-concept-text:hover {
  fill: #6b7280;
}
</style>
