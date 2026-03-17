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
                <MetricCard title="Entities" :metrics="goldComparison.corpus.entities" :kappa="goldComparison.corpus.kappa" />
                <MetricCard title="Relations" :metrics="goldComparison.corpus.relations" />
                <MetricCard title="Combined" :metrics="goldComparison.corpus.combined" />
              </div>
            </section>

            <section v-if="sortedEntityTypeRows.length > 0" class="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 class="text-sm font-medium text-gray-700 mb-2">Entity Type Breakdown</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full text-xs">
                  <thead>
                    <tr class="text-left text-gray-500 border-b border-gray-200">
                      <th class="py-1 pr-4 w-36">Type</th>
                      <th class="py-1 pr-4">Strict F1</th>
                      <th class="py-1 pr-4">Relaxed F1</th>
                      <th class="py-1 pr-3">Strict P / R</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in sortedEntityTypeRows" :key="row.type" class="border-b border-gray-50">
                      <td class="py-1.5 pr-4 font-medium text-gray-700">{{ row.type }}</td>
                      <td class="py-1.5 pr-4">
                        <div class="flex items-center gap-2">
                          <div class="w-20 h-2 bg-gray-100 rounded overflow-hidden">
                            <div class="h-full bg-blue-400 rounded" :style="{ width: (row.strict.f1 * 100) + '%' }" />
                          </div>
                          <span class="text-gray-800 font-medium w-12">{{ formatPercent(row.strict.f1) }}</span>
                        </div>
                      </td>
                      <td class="py-1.5 pr-4">
                        <div class="flex items-center gap-2">
                          <div class="w-20 h-2 bg-gray-100 rounded overflow-hidden">
                            <div class="h-full bg-blue-300 rounded" :style="{ width: (row.relaxed.f1 * 100) + '%' }" />
                          </div>
                          <span class="text-gray-700 w-12">{{ formatPercent(row.relaxed.f1) }}</span>
                        </div>
                      </td>
                      <td class="py-1.5 pr-3 text-gray-500">
                        {{ formatPercent(row.strict.precision) }} / {{ formatPercent(row.strict.recall) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
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
                      <th class="py-1 pr-3">Cohen's κ</th>
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
                      <td class="py-1 pr-3">{{ row.kappa != null ? row.kappa.toFixed(3) : 'N/A' }}</td>
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
                      <th class="py-1 pr-3">Cohen's κ</th>
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
                      <td class="py-1 pr-3">{{ row.kappa != null ? row.kappa.toFixed(3) : 'N/A' }}</td>
                      <td class="py-1 pr-3">{{ row.predCounts.entities }}/{{ row.predCounts.relations }}</td>
                      <td class="py-1 pr-3">{{ row.goldCounts.entities }}/{{ row.goldCounts.relations }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="goldComparison.corpus.kappa != null" class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-600">
                  <span class="font-medium">Macro-averaged Cohen's κ:</span>
                  <span class="text-gray-900 font-mono">{{ goldComparison.corpus.kappa.toFixed(3) }}</span>
                  <span class="text-gray-400">(character-level, entity labels)</span>
                </div>
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

              <div v-if="selectedDocName">
                <!-- Entity disagreement cards -->
                <div v-if="currentDocEntityDisagreements.length === 0" class="text-xs text-gray-400 italic mb-3">
                  All entities match strictly — no entity disagreements.
                </div>
                <div
                  v-for="(item, idx) in currentDocEntityDisagreements"
                  :key="'dis-' + idx"
                  class="mb-3 border border-dashed rounded-lg p-3"
                  :class="item.matchType === 'boundary' ? 'border-amber-300' : 'border-red-200'"
                >
                  <!-- Card header -->
                  <div class="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 text-xs">
                    <span class="px-1.5 py-0.5 bg-gray-100 rounded font-medium text-gray-700">
                      {{ item.gold?.semantic || item.compare?.semantic }}
                    </span>
                    <span v-if="item.matchType === 'boundary'" class="text-amber-600 font-medium">Boundary mismatch</span>
                    <span v-else-if="item.matchType === 'gold_only'" class="text-red-500 font-medium">Missing in {{ currentCompareAnnotator?.name }}</span>
                    <span v-else class="text-red-500 font-medium">Missing in {{ currentGoldAnnotator?.name }} (Gold)</span>
                  </div>
                  <!-- Two-column context -->
                  <div class="grid grid-cols-2 gap-3">
                    <!-- Gold side -->
                    <div>
                      <div class="text-[11px] font-medium text-gray-600 mb-1">{{ currentGoldAnnotator?.name }} (Gold)</div>
                      <template v-if="item.gold">
                        <div class="text-[11px] font-mono text-gray-500 mb-1">
                          {{ item.gold.begin }}~{{ item.gold.end }}:
                          <strong class="text-gray-800">"{{ item.content.slice(item.gold.begin, item.gold.end) }}"</strong>
                        </div>
                        <div class="text-xs bg-gray-50 rounded p-2 leading-5 break-words">
                          <span class="text-gray-400">{{ item.content.slice(Math.max(0, item.gold.begin - 100), item.gold.begin) }}</span><mark class="bg-amber-200 rounded-sm px-0.5 text-gray-900 not-italic">{{ item.content.slice(item.gold.begin, item.gold.end) }}</mark><span class="text-gray-400">{{ item.content.slice(item.gold.end, Math.min(item.content.length, item.gold.end + 100)) }}</span>
                        </div>
                      </template>
                      <div v-else class="text-xs text-gray-400 italic bg-gray-50 rounded p-2">Not annotated</div>
                    </div>
                    <!-- Compare side -->
                    <div>
                      <div class="text-[11px] font-medium text-gray-600 mb-1">{{ currentCompareAnnotator?.name }}</div>
                      <template v-if="item.compare">
                        <div class="text-[11px] font-mono text-gray-500 mb-1">
                          {{ item.compare.begin }}~{{ item.compare.end }}:
                          <strong class="text-gray-800">"{{ item.content.slice(item.compare.begin, item.compare.end) }}"</strong>
                        </div>
                        <div class="text-xs bg-gray-50 rounded p-2 leading-5 break-words">
                          <span class="text-gray-400">{{ item.content.slice(Math.max(0, item.compare.begin - 100), item.compare.begin) }}</span><mark class="bg-cyan-200 rounded-sm px-0.5 text-gray-900 not-italic">{{ item.content.slice(item.compare.begin, item.compare.end) }}</mark><span class="text-gray-400">{{ item.content.slice(item.compare.end, Math.min(item.content.length, item.compare.end + 100)) }}</span>
                        </div>
                      </template>
                      <div v-else class="text-xs text-gray-400 italic bg-gray-50 rounded p-2">Not annotated</div>
                    </div>
                  </div>
                </div>

                <!-- Relation disagreements -->
                <div v-if="currentDocRelationDisagreements.length > 0" class="mt-4">
                  <div class="text-xs font-medium text-gray-700 mb-2">Relation Disagreements</div>
                  <div
                    v-for="(item, idx) in currentDocRelationDisagreements"
                    :key="'rel-' + idx"
                    class="mb-3 border border-dashed rounded-lg p-3"
                    :class="item.matchType === 'boundary' ? 'border-amber-300' : 'border-red-200'"
                  >
                    <!-- Card header -->
                    <div class="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100 text-xs">
                      <span class="px-1.5 py-0.5 bg-gray-100 rounded font-medium text-gray-700">
                        {{ item.gold?.semantic || item.compare?.semantic }}
                      </span>
                      <span v-if="item.matchType === 'boundary'" class="text-amber-600 font-medium">Boundary mismatch</span>
                      <span v-else-if="item.matchType === 'gold_only'" class="text-red-500 font-medium">Missing in {{ currentCompareAnnotator?.name }}</span>
                      <span v-else class="text-red-500 font-medium">Missing in {{ currentGoldAnnotator?.name }} (Gold)</span>
                    </div>
                    <!-- Two columns -->
                    <div class="grid grid-cols-2 gap-3">
                      <!-- Gold side -->
                      <div>
                        <div class="text-[11px] font-medium text-gray-600 mb-1">{{ currentGoldAnnotator?.name }} (Gold)</div>
                        <template v-if="item.gold">
                          <div class="text-[11px] text-gray-500 mb-0.5">
                            <span class="font-semibold text-gray-700">FROM</span> · {{ item.gold.fromEnt.semantic }} · <span class="font-mono">{{ item.gold.fromEnt.begin }}~{{ item.gold.fromEnt.end }}</span> · <strong class="text-gray-800">"{{ item.content.slice(item.gold.fromEnt.begin, item.gold.fromEnt.end) }}"</strong>
                          </div>
                          <div class="text-xs bg-gray-50 rounded p-2 leading-5 break-words mb-2">
                            <span class="text-gray-400">{{ item.content.slice(Math.max(0, item.gold.fromEnt.begin - 80), item.gold.fromEnt.begin) }}</span><mark class="bg-amber-200 rounded-sm px-0.5 text-gray-900 not-italic">{{ item.content.slice(item.gold.fromEnt.begin, item.gold.fromEnt.end) }}</mark><span class="text-gray-400">{{ item.content.slice(item.gold.fromEnt.end, Math.min(item.content.length, item.gold.fromEnt.end + 80)) }}</span>
                          </div>
                          <div class="text-[11px] text-gray-500 mb-0.5">
                            <span class="font-semibold text-gray-700">TO</span> · {{ item.gold.toEnt.semantic }} · <span class="font-mono">{{ item.gold.toEnt.begin }}~{{ item.gold.toEnt.end }}</span> · <strong class="text-gray-800">"{{ item.content.slice(item.gold.toEnt.begin, item.gold.toEnt.end) }}"</strong>
                          </div>
                          <div class="text-xs bg-gray-50 rounded p-2 leading-5 break-words">
                            <span class="text-gray-400">{{ item.content.slice(Math.max(0, item.gold.toEnt.begin - 80), item.gold.toEnt.begin) }}</span><mark class="bg-amber-200 rounded-sm px-0.5 text-gray-900 not-italic">{{ item.content.slice(item.gold.toEnt.begin, item.gold.toEnt.end) }}</mark><span class="text-gray-400">{{ item.content.slice(item.gold.toEnt.end, Math.min(item.content.length, item.gold.toEnt.end + 80)) }}</span>
                          </div>
                        </template>
                        <div v-else class="text-xs text-gray-400 italic bg-gray-50 rounded p-2">Not annotated</div>
                      </div>
                      <!-- Compare side -->
                      <div>
                        <div class="text-[11px] font-medium text-gray-600 mb-1">{{ currentCompareAnnotator?.name }}</div>
                        <template v-if="item.compare">
                          <div class="text-[11px] text-gray-500 mb-0.5">
                            <span class="font-semibold text-gray-700">FROM</span> · {{ item.compare.fromEnt.semantic }} · <span class="font-mono">{{ item.compare.fromEnt.begin }}~{{ item.compare.fromEnt.end }}</span> · <strong class="text-gray-800">"{{ item.content.slice(item.compare.fromEnt.begin, item.compare.fromEnt.end) }}"</strong>
                          </div>
                          <div class="text-xs bg-gray-50 rounded p-2 leading-5 break-words mb-2">
                            <span class="text-gray-400">{{ item.content.slice(Math.max(0, item.compare.fromEnt.begin - 80), item.compare.fromEnt.begin) }}</span><mark class="bg-cyan-200 rounded-sm px-0.5 text-gray-900 not-italic">{{ item.content.slice(item.compare.fromEnt.begin, item.compare.fromEnt.end) }}</mark><span class="text-gray-400">{{ item.content.slice(item.compare.fromEnt.end, Math.min(item.content.length, item.compare.fromEnt.end + 80)) }}</span>
                          </div>
                          <div class="text-[11px] text-gray-500 mb-0.5">
                            <span class="font-semibold text-gray-700">TO</span> · {{ item.compare.toEnt.semantic }} · <span class="font-mono">{{ item.compare.toEnt.begin }}~{{ item.compare.toEnt.end }}</span> · <strong class="text-gray-800">"{{ item.content.slice(item.compare.toEnt.begin, item.compare.toEnt.end) }}"</strong>
                          </div>
                          <div class="text-xs bg-gray-50 rounded p-2 leading-5 break-words">
                            <span class="text-gray-400">{{ item.content.slice(Math.max(0, item.compare.toEnt.begin - 80), item.compare.toEnt.begin) }}</span><mark class="bg-cyan-200 rounded-sm px-0.5 text-gray-900 not-italic">{{ item.content.slice(item.compare.toEnt.begin, item.compare.toEnt.end) }}</mark><span class="text-gray-400">{{ item.content.slice(item.compare.toEnt.end, Math.min(item.content.length, item.compare.toEnt.end + 80)) }}</span>
                          </div>
                        </template>
                        <div v-else class="text-xs text-gray-400 italic bg-gray-50 rounded p-2">Not annotated</div>
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
import { normalizeAnnotationData } from '../utils/fileConverters.js'
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

function computeEntityDisagreements(goldEntities, compareEntities, content) {
  const items = []
  const pairedCompareIdxs = new Set()

  for (let gi = 0; gi < goldEntities.length; gi++) {
    const gold = goldEntities[gi]
    if (compareEntities.some((c) => entityStrictMatch(gold, c))) continue

    let pairedCi = -1
    for (let ci = 0; ci < compareEntities.length; ci++) {
      if (pairedCompareIdxs.has(ci)) continue
      if (entityRelaxedMatch(gold, compareEntities[ci])) { pairedCi = ci; break }
    }

    if (pairedCi >= 0) {
      pairedCompareIdxs.add(pairedCi)
      items.push({ matchType: 'boundary', gold, compare: compareEntities[pairedCi], content })
    } else {
      items.push({ matchType: 'gold_only', gold, compare: null, content })
    }
  }

  for (let ci = 0; ci < compareEntities.length; ci++) {
    if (pairedCompareIdxs.has(ci)) continue
    const compare = compareEntities[ci]
    if (goldEntities.some((g) => entityStrictMatch(g, compare))) continue
    items.push({ matchType: 'compare_only', gold: null, compare, content })
  }
  return items
}

function computeRelationDisagreements(goldRelations, compareRelations, content) {
  const items = []
  const pairedCompareIdxs = new Set()

  for (const gold of goldRelations) {
    if (compareRelations.some((c) => relationStrictMatch(gold, c))) continue
    let pairedCi = -1
    for (let ci = 0; ci < compareRelations.length; ci++) {
      if (pairedCompareIdxs.has(ci)) continue
      if (relationRelaxedMatch(gold, compareRelations[ci])) { pairedCi = ci; break }
    }
    if (pairedCi >= 0) {
      pairedCompareIdxs.add(pairedCi)
      items.push({ matchType: 'boundary', gold, compare: compareRelations[pairedCi], content })
    } else {
      items.push({ matchType: 'gold_only', gold, compare: null, content })
    }
  }

  for (let ci = 0; ci < compareRelations.length; ci++) {
    if (pairedCompareIdxs.has(ci)) continue
    const compare = compareRelations[ci]
    if (goldRelations.some((g) => relationStrictMatch(g, compare))) continue
    items.push({ matchType: 'compare_only', gold: null, compare, content })
  }
  return items
}

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
        kappa: result.corpus.kappa,
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

const sortedEntityTypeRows = computed(() => {
  const map = goldComparison.value?.corpus.entityTypeMetrics ?? {}
  return Object.entries(map)
    .map(([type, metrics]) => ({ type, strict: metrics.strict, relaxed: metrics.relaxed }))
    .sort((a, b) => b.strict.f1 - a.strict.f1)
})

const currentDocEntityDisagreements = computed(() => {
  const content = currentGoldDoc.value?.content || currentCompareDoc.value?.content || ''
  return computeEntityDisagreements(
    currentGoldDoc.value?.entities ?? [],
    currentCompareDoc.value?.entities ?? [],
    content,
  )
})

const currentDocRelationDisagreements = computed(() => {
  const content = currentGoldDoc.value?.content || currentCompareDoc.value?.content || ''
  return computeRelationDisagreements(
    currentGoldDoc.value?.relations ?? [],
    currentCompareDoc.value?.relations ?? [],
    content,
  )
})

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
    const normalized = normalizeAnnotationData(parsed, entry.name)
    if (!validateAnnotationFile(normalized)) continue
    docs.set(entry.name, parseAnnotationDocument(normalized, entry.name))
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
    kappa: { type: Number, default: null },
  },
  setup(props) {
    const p = (n) => `${(n * 100).toFixed(1)}%`
    return () => {
      const children = [
        h('div', { class: 'text-xs font-medium text-gray-600 mb-1' }, props.title),
        h('div', { class: 'text-[11px] text-gray-500 mb-1' }, 'Strict'),
        h('div', { class: 'text-xs text-gray-700 mb-2' }, `P ${p(props.metrics.strict.precision)} | R ${p(props.metrics.strict.recall)} | F1 ${p(props.metrics.strict.f1)}`),
        h('div', { class: 'text-[11px] text-gray-500 mb-1' }, 'Relaxed'),
        h('div', { class: 'text-xs text-gray-700' }, `P ${p(props.metrics.relaxed.precision)} | R ${p(props.metrics.relaxed.recall)} | F1 ${p(props.metrics.relaxed.f1)}`),
      ]
      if (props.kappa != null) {
        children.push(
          h('div', { class: 'text-[11px] text-gray-500 mt-2 mb-1' }, "Cohen's κ"),
          h('div', { class: 'text-xs text-gray-700' }, props.kappa.toFixed(3)),
        )
      }
      return h('div', { class: 'border border-gray-200 rounded p-3' }, children)
    }
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
