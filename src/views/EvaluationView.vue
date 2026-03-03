<template>
  <div class="evaluation-view">
    <header class="border-b border-gray-200 bg-white flex items-center justify-between px-4 h-12">
      <span class="text-sm font-medium text-gray-700">
        <font-awesome-icon :icon="['fas', 'scale-balanced']" class="mr-2 text-gray-400" />
        Evaluation
      </span>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          :disabled="loading"
          @click="addAnnotatorFolder"
        >
          <font-awesome-icon :icon="['fas', 'folder-open']" class="mr-1" />
          Load Annotator Folder
        </button>
        <button
          class="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          :disabled="annotators.length === 0 || loading"
          @click="clearAll"
        >
          Clear
        </button>
      </div>
    </header>

    <div class="flex-1 min-h-0 grid grid-cols-[280px_1fr]">
      <aside class="border-r border-gray-200 bg-white overflow-y-auto">
        <div class="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
          Annotators ({{ annotators.length }})
        </div>
        <div v-if="annotators.length === 0" class="p-3 text-xs text-gray-400">
          Load at least two folders to start evaluation.
        </div>
        <div v-for="annotator in annotators" :key="annotator.id" class="px-3 py-2 border-b border-gray-50">
          <div class="flex items-start justify-between gap-2">
            <label class="flex items-center gap-2 min-w-0">
              <input
                type="radio"
                name="gold-annotator"
                class="mt-0.5"
                :checked="goldAnnotatorId === annotator.id"
                @change="setGoldAnnotator(annotator.id)"
              />
              <span class="text-sm text-gray-700 truncate" :title="annotator.name">{{ annotator.name }}</span>
            </label>
            <button
              class="text-xs text-gray-400 hover:text-red-500"
              title="Remove annotator"
              @click="removeAnnotator(annotator.id)"
            >
              <font-awesome-icon :icon="['fas', 'xmark']" />
            </button>
          </div>
          <div class="text-[11px] text-gray-400 mt-1">
            {{ annotator.docs.size }} docs
            <span v-if="goldAnnotatorId === annotator.id" class="ml-1 text-yale-600 font-medium">(Gold)</span>
          </div>
        </div>
      </aside>

      <main class="min-h-0 overflow-y-auto bg-gray-50">
        <div class="p-4">
          <div v-if="errorMessage" class="mb-3 p-2 border border-red-200 bg-red-50 rounded text-xs text-red-600">
            {{ errorMessage }}
          </div>

          <div v-if="annotators.length < 2" class="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
            Load at least two annotator folders to compute agreement metrics.
          </div>

          <template v-else>
            <section class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div class="flex items-center gap-3 mb-3">
                <span class="text-sm font-medium text-gray-700">Compare Against Gold</span>
                <select
                  v-model="selectedCompareAnnotatorId"
                  class="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option
                    v-for="annotator in compareAnnotatorOptions"
                    :key="annotator.id"
                    :value="annotator.id"
                  >
                    {{ annotator.name }}
                  </option>
                </select>
              </div>

              <div v-if="goldComparison" class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <MetricCard title="Entities" :metrics="goldComparison.corpus.entities" />
                <MetricCard title="Relations" :metrics="goldComparison.corpus.relations" />
                <MetricCard title="Combined" :metrics="goldComparison.corpus.combined" />
              </div>
            </section>

            <section v-if="pairwiseRows.length > 0" class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Pairwise Comparisons</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full text-xs">
                  <thead>
                    <tr class="text-left text-gray-500 border-b border-gray-200">
                      <th class="py-1 pr-3">Pair</th>
                      <th class="py-1 pr-3">Strict F1</th>
                      <th class="py-1 pr-3">Relaxed F1</th>
                      <th class="py-1 pr-3">Strict P/R</th>
                      <th class="py-1 pr-3">Relaxed P/R</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in pairwiseRows"
                      :key="row.key"
                      class="border-b border-gray-100 text-gray-700"
                    >
                      <td class="py-1 pr-3">{{ row.left }} vs {{ row.right }}</td>
                      <td class="py-1 pr-3">{{ formatPercent(row.metrics.strict.f1) }}</td>
                      <td class="py-1 pr-3">{{ formatPercent(row.metrics.relaxed.f1) }}</td>
                      <td class="py-1 pr-3">
                        {{ formatPercent(row.metrics.strict.precision) }}/{{ formatPercent(row.metrics.strict.recall) }}
                      </td>
                      <td class="py-1 pr-3">
                        {{ formatPercent(row.metrics.relaxed.precision) }}/{{ formatPercent(row.metrics.relaxed.recall) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Document-Level Metrics</h3>
              <div v-if="goldComparison" class="overflow-x-auto">
                <table class="min-w-full text-xs">
                  <thead>
                    <tr class="text-left text-gray-500 border-b border-gray-200">
                      <th class="py-1 pr-3">Document</th>
                      <th class="py-1 pr-3">Strict F1</th>
                      <th class="py-1 pr-3">Relaxed F1</th>
                      <th class="py-1 pr-3">Pred (E/R)</th>
                      <th class="py-1 pr-3">Gold (E/R)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in goldComparison.documentResults"
                      :key="row.fileName"
                      class="border-b border-gray-100 text-gray-700"
                    >
                      <td class="py-1 pr-3">{{ row.fileName }}</td>
                      <td class="py-1 pr-3">{{ formatPercent(row.combined.strict.f1) }}</td>
                      <td class="py-1 pr-3">{{ formatPercent(row.combined.relaxed.f1) }}</td>
                      <td class="py-1 pr-3">{{ row.predCounts.entities }}/{{ row.predCounts.relations }}</td>
                      <td class="py-1 pr-3">{{ row.goldCounts.entities }}/{{ row.goldCounts.relations }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="bg-white border border-gray-200 rounded-lg p-4">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <h3 class="text-sm font-medium text-gray-700 mr-2">Detailed Differences</h3>
                <select
                  v-model="selectedDocName"
                  class="text-sm border border-gray-300 rounded px-2 py-1 bg-white min-w-[220px]"
                >
                  <option v-for="docName in selectedDocOptions" :key="docName" :value="docName">
                    {{ docName }}
                  </option>
                </select>
              </div>

              <div v-if="selectedDocName" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div class="border border-gray-200 rounded">
                  <div class="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-700 bg-gray-50">
                    {{ currentGoldAnnotator?.name }} (Gold)
                  </div>
                  <div class="p-3 text-xs text-gray-700">
                    <pre class="whitespace-pre-wrap break-words max-h-48 overflow-y-auto bg-gray-50 border border-gray-100 rounded p-2 text-[11px] leading-5"><span v-for="(seg, index) in goldSegments" :key="'g-' + index" :class="seg.highlighted ? 'bg-amber-200' : ''">{{ seg.text }}</span></pre>
                    <div class="mt-2">
                      <div class="font-medium mb-1">Entities</div>
                      <div v-for="(item, index) in goldEntityRows" :key="'ge-' + index" class="mb-1">
                        <StatusBadge :status="item.status" />
                        <span class="ml-1">{{ item.semantic }} [{{ item.begin }}, {{ item.end }}]</span>
                      </div>
                    </div>
                    <div class="mt-2">
                      <div class="font-medium mb-1">Relations</div>
                      <div v-for="(item, index) in goldRelationRows" :key="'gr-' + index" class="mb-1">
                        <StatusBadge :status="item.status" />
                        <span class="ml-1">{{ item.semantic }}: {{ item.fromText }} -> {{ item.toText }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="border border-gray-200 rounded">
                  <div class="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-700 bg-gray-50">
                    {{ currentCompareAnnotator?.name }}
                  </div>
                  <div class="p-3 text-xs text-gray-700">
                    <pre class="whitespace-pre-wrap break-words max-h-48 overflow-y-auto bg-gray-50 border border-gray-100 rounded p-2 text-[11px] leading-5"><span v-for="(seg, index) in compareSegments" :key="'p-' + index" :class="seg.highlighted ? 'bg-cyan-200' : ''">{{ seg.text }}</span></pre>
                    <div class="mt-2">
                      <div class="font-medium mb-1">Entities</div>
                      <div v-for="(item, index) in compareEntityRows" :key="'pe-' + index" class="mb-1">
                        <StatusBadge :status="item.status" />
                        <span class="ml-1">{{ item.semantic }} [{{ item.begin }}, {{ item.end }}]</span>
                      </div>
                    </div>
                    <div class="mt-2">
                      <div class="font-medium mb-1">Relations</div>
                      <div v-for="(item, index) in compareRelationRows" :key="'pr-' + index" class="mb-1">
                        <StatusBadge :status="item.status" />
                        <span class="ml-1">{{ item.semantic }}: {{ item.fromText }} -> {{ item.toText }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </template>
        </div>
      </main>
    </div>

    <footer class="border-t border-gray-200 bg-gray-50 flex items-center px-4 text-xs text-gray-500 h-5">
      <span>Annotators: {{ annotators.length }}</span>
      <span class="ml-4">Documents: {{ totalDocs }}</span>
      <span class="ml-4">Gold: {{ currentGoldAnnotator?.name || '-' }}</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, ref, watch } from 'vue'
import { validateAnnotationFile } from '../utils/validators.js'
import {
  buildHighlightSegments,
  entityRelaxedMatch,
  entityStrictMatch,
  evaluateCorpus,
  matchStatus,
  parseAnnotationDocument,
  relationRelaxedMatch,
  relationStrictMatch,
} from '../utils/evaluation.js'

const annotators = ref([])
const goldAnnotatorId = ref(null)
const selectedCompareAnnotatorId = ref(null)
const selectedDocName = ref('')
const loading = ref(false)
const errorMessage = ref('')

const currentGoldAnnotator = computed(() => annotators.value.find((a) => a.id === goldAnnotatorId.value) ?? null)
const compareAnnotatorOptions = computed(() => annotators.value.filter((a) => a.id !== goldAnnotatorId.value))
const currentCompareAnnotator = computed(() => compareAnnotatorOptions.value.find((a) => a.id === selectedCompareAnnotatorId.value) ?? compareAnnotatorOptions.value[0] ?? null)

const goldComparison = computed(() => {
  if (!currentGoldAnnotator.value || !currentCompareAnnotator.value) return null
  return evaluateCorpus(currentCompareAnnotator.value.docs, currentGoldAnnotator.value.docs)
})

const pairwiseRows = computed(() => {
  if (annotators.value.length <= 2) return []
  const rows = []
  for (let i = 0; i < annotators.value.length; i++) {
    for (let j = i + 1; j < annotators.value.length; j++) {
      const left = annotators.value[i]
      const right = annotators.value[j]
      const result = evaluateCorpus(right.docs, left.docs)
      rows.push({
        key: `${left.id}-${right.id}`,
        left: left.name,
        right: right.name,
        metrics: result.corpus.combined,
      })
    }
  }
  return rows
})

const selectedDocOptions = computed(() => {
  if (!currentGoldAnnotator.value || !currentCompareAnnotator.value) return []
  const names = new Set([
    ...Array.from(currentGoldAnnotator.value.docs.keys()),
    ...Array.from(currentCompareAnnotator.value.docs.keys()),
  ])
  return Array.from(names).sort()
})

const currentGoldDoc = computed(() => {
  if (!currentGoldAnnotator.value || !selectedDocName.value) return null
  return currentGoldAnnotator.value.docs.get(selectedDocName.value) ?? null
})

const currentCompareDoc = computed(() => {
  if (!currentCompareAnnotator.value || !selectedDocName.value) return null
  return currentCompareAnnotator.value.docs.get(selectedDocName.value) ?? null
})

const displayContent = computed(() => {
  return currentGoldDoc.value?.content || currentCompareDoc.value?.content || ''
})

const goldSegments = computed(() => {
  const spans = currentGoldDoc.value?.entities ?? []
  return buildHighlightSegments(displayContent.value, spans)
})

const compareSegments = computed(() => {
  const spans = currentCompareDoc.value?.entities ?? []
  return buildHighlightSegments(displayContent.value, spans)
})

const goldEntityRows = computed(() => {
  const source = currentGoldDoc.value?.entities ?? []
  const reference = currentCompareDoc.value?.entities ?? []
  return source.map((item) => ({
    ...item,
    status: matchStatus(item, reference, entityStrictMatch, entityRelaxedMatch),
  }))
})

const compareEntityRows = computed(() => {
  const source = currentCompareDoc.value?.entities ?? []
  const reference = currentGoldDoc.value?.entities ?? []
  return source.map((item) => ({
    ...item,
    status: matchStatus(item, reference, entityStrictMatch, entityRelaxedMatch),
  }))
})

const goldRelationRows = computed(() => {
  const source = currentGoldDoc.value?.relations ?? []
  const reference = currentCompareDoc.value?.relations ?? []
  return source.map((item) => ({
    ...item,
    fromText: `${item.fromEnt.semantic}[${item.fromEnt.begin}, ${item.fromEnt.end}]`,
    toText: `${item.toEnt.semantic}[${item.toEnt.begin}, ${item.toEnt.end}]`,
    status: matchStatus(item, reference, relationStrictMatch, relationRelaxedMatch),
  }))
})

const compareRelationRows = computed(() => {
  const source = currentCompareDoc.value?.relations ?? []
  const reference = currentGoldDoc.value?.relations ?? []
  return source.map((item) => ({
    ...item,
    fromText: `${item.fromEnt.semantic}[${item.fromEnt.begin}, ${item.fromEnt.end}]`,
    toText: `${item.toEnt.semantic}[${item.toEnt.begin}, ${item.toEnt.end}]`,
    status: matchStatus(item, reference, relationStrictMatch, relationRelaxedMatch),
  }))
})

const totalDocs = computed(() => annotators.value.reduce((sum, a) => sum + a.docs.size, 0))

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function syncSelections() {
  const compareOptions = compareAnnotatorOptions.value
  if (!compareOptions.some((a) => a.id === selectedCompareAnnotatorId.value)) {
    selectedCompareAnnotatorId.value = compareOptions[0]?.id ?? null
  }
  if (!selectedDocOptions.value.includes(selectedDocName.value)) {
    selectedDocName.value = selectedDocOptions.value[0] ?? ''
  }
}

watch([goldAnnotatorId, selectedCompareAnnotatorId], () => {
  syncSelections()
})

function setGoldAnnotator(id) {
  goldAnnotatorId.value = id
  syncSelections()
}

function removeAnnotator(id) {
  annotators.value = annotators.value.filter((a) => a.id !== id)
  if (goldAnnotatorId.value === id) {
    goldAnnotatorId.value = annotators.value[0]?.id ?? null
  }
  syncSelections()
}

function clearAll() {
  annotators.value = []
  goldAnnotatorId.value = null
  selectedCompareAnnotatorId.value = null
  selectedDocName.value = ''
  errorMessage.value = ''
}

function nextAnnotatorId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function readAnnotatorFolder(handle) {
  const docs = new Map()
  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue
    if (!entry.name.toLowerCase().endsWith('.json')) continue

    const file = await entry.getFile()
    const raw = await file.text()
    let parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    if (!validateAnnotationFile(parsed)) continue
    docs.set(entry.name, parseAnnotationDocument(parsed, entry.name))
  }
  return docs
}

async function addAnnotatorFolder() {
  errorMessage.value = ''
  try {
    loading.value = true
    const handle = await window.showDirectoryPicker()
    const docs = await readAnnotatorFolder(handle)
    if (docs.size === 0) {
      errorMessage.value = `No valid annotation JSON files found in "${handle.name}".`
      return
    }

    const annotator = {
      id: nextAnnotatorId(),
      name: handle.name,
      docs,
    }
    annotators.value.push(annotator)

    if (!goldAnnotatorId.value) {
      goldAnnotatorId.value = annotator.id
    }
    syncSelections()
  } catch (error) {
    if (error?.name !== 'AbortError') {
      errorMessage.value = error?.message || 'Failed to load folder.'
    }
  } finally {
    loading.value = false
  }
}

const MetricCard = defineComponent({
  name: 'MetricCard',
  props: {
    title: { type: String, required: true },
    metrics: { type: Object, required: true },
  },
  setup(props) {
    const p = (n) => `${(n * 100).toFixed(1)}%`
    return () => h('div', { class: 'border border-gray-200 rounded p-3' }, [
      h('div', { class: 'text-xs font-medium text-gray-600 mb-1' }, props.title),
      h('div', { class: 'text-[11px] text-gray-500 mb-1' }, 'Strict'),
      h('div', { class: 'text-xs text-gray-700 mb-2' }, `P ${p(props.metrics.strict.precision)} | R ${p(props.metrics.strict.recall)} | F1 ${p(props.metrics.strict.f1)}`),
      h('div', { class: 'text-[11px] text-gray-500 mb-1' }, 'Relaxed'),
      h('div', { class: 'text-xs text-gray-700' }, `P ${p(props.metrics.relaxed.precision)} | R ${p(props.metrics.relaxed.recall)} | F1 ${p(props.metrics.relaxed.f1)}`),
    ])
  },
})

const StatusBadge = defineComponent({
  name: 'StatusBadge',
  props: {
    status: { type: String, required: true },
  },
  setup(props) {
    const labelMap = {
      strict: 'strict',
      relaxed: 'relaxed',
      mismatch: 'mismatch',
    }
    const classMap = {
      strict: 'bg-green-100 text-green-700 border-green-200',
      relaxed: 'bg-amber-100 text-amber-700 border-amber-200',
      mismatch: 'bg-red-100 text-red-700 border-red-200',
    }
    return () => h(
      'span',
      {
        class: `inline-block px-1.5 py-0.5 rounded border text-[10px] ${classMap[props.status] || classMap.mismatch}`,
      },
      labelMap[props.status] || props.status,
    )
  },
})
</script>

<style scoped>
.evaluation-view {
  display: grid;
  grid-template-rows: 3rem 1fr 1.25rem;
  height: 100%;
  overflow: hidden;
}
</style>
