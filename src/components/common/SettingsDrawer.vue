<template>
  <Drawer v-model:visible="visible" position="left" header="Settings" :style="{ width: '400px' }">
    <Tabs value="general">
      <TabList>
        <Tab value="general">General</Tab>
        <Tab value="agent">Agent</Tab>
        <Tab value="vocabulary">Vocabulary</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="general">
          <div class="flex flex-col gap-5 pt-3">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-sm font-medium text-gray-800">Auto-save</div>
                <div class="text-xs text-gray-500 mt-0.5">Automatically save annotation files on change</div>
              </div>
              <ToggleSwitch v-model="settings.autoSave" />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="agent">
          <div class="flex flex-col gap-4 pt-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700">OpenAI Type</label>
              <Select
                v-model="settings.openAIType"
                :options="openAITypeOptions"
                option-label="label"
                option-value="value"
                class="w-full"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700">Base URL</label>
              <InputText
                v-model="settings.openAIBaseUrl"
                class="w-full"
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700">API Key</label>
              <InputText
                v-model="settings.openAIApiKey"
                type="password"
                class="w-full"
                placeholder="sk-..."
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700">Model</label>
              <InputText
                v-model="settings.openAIModel"
                class="w-full"
                placeholder="gpt-5.1-codex-mini"
              />
            </div>
          </div>
        </TabPanel>

        <TabPanel value="vocabulary">
          <div class="flex flex-col gap-4 pt-3">
            <!-- Summary -->
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div class="text-sm text-gray-600">
                <div class="font-medium">{{ vocabStore.vocabCollections.length }} collections</div>
                <div class="text-xs text-gray-400">{{ vocabStore.totalCachedRecords.toLocaleString() }} cached records</div>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="vocabStore.indexStatus === 'ready'" class="text-xs text-green-600 flex items-center gap-1">
                  <font-awesome-icon :icon="['fas', 'circle-check']" />
                  Index Ready ({{ vocabStore.indexedDocCount.toLocaleString() }})
                </span>
                <span v-else-if="vocabStore.indexStatus === 'indexing'" class="text-xs text-blue-600 flex items-center gap-1">
                  <font-awesome-icon :icon="['fas', 'spinner']" class="animate-spin" />
                  Indexing...
                </span>
                <span v-else-if="vocabStore.indexStatus === 'loading'" class="text-xs text-yellow-600 flex items-center gap-1">
                  <font-awesome-icon :icon="['fas', 'spinner']" class="animate-spin" />
                  Loading...
                </span>
              </div>
            </div>

            <!-- System Vocabularies -->
            <div>
              <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System Vocabularies</div>
              <div class="space-y-2">
                <div
                  v-for="vocab in vocabStore.systemVocabs"
                  :key="vocab.name"
                  class="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div class="text-sm font-medium text-gray-700">{{ vocab.name }}</div>
                    <div class="text-xs text-gray-400">
                      {{ vocab.cached ? vocab.recordCount.toLocaleString() + ' records' : 'Not cached' }}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <template v-if="vocab.cached">
                      <button
                        class="text-xs px-2 py-1 rounded border"
                        :class="vocab.included
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'"
                        @click="toggleVocabIncluded(vocab)"
                      >
                        {{ vocab.included ? 'Included' : 'Not Included' }}
                      </button>
                      <button
                        class="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50"
                        @click="clearVocabCache(vocab)"
                      >
                        Clear
                      </button>
                    </template>
                    <button
                      v-else
                      class="text-xs px-2 py-1 bg-yale-500 text-white rounded hover:bg-yale-600"
                      :disabled="vocabStore.indexStatus === 'loading'"
                      @click="loadVocab(vocab)"
                    >
                      Load
                    </button>
                  </div>
                </div>
                <div v-if="vocabStore.systemVocabs.length === 0" class="text-xs text-gray-400 py-2">
                  No system vocabularies found
                </div>
              </div>
            </div>

            <!-- User Vocabularies -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">User Vocabularies</span>
                <label class="text-xs text-yale-500 hover:text-yale-600 cursor-pointer flex items-center gap-1">
                  <font-awesome-icon :icon="['fas', 'upload']" class="text-[10px]" />
                  Upload TSV
                  <input type="file" accept=".tsv" class="hidden" @change="uploadVocab" />
                </label>
              </div>
              <div class="space-y-2">
                <div
                  v-for="vocab in vocabStore.userVocabs"
                  :key="vocab.name"
                  class="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div class="text-sm font-medium text-gray-700">{{ vocab.name }}</div>
                    <div class="text-xs text-gray-400">{{ vocab.recordCount.toLocaleString() }} records</div>
                  </div>
                  <button
                    class="text-xs px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50"
                    @click="removeUserVocab(vocab)"
                  >
                    Remove
                  </button>
                </div>
                <div v-if="vocabStore.userVocabs.length === 0" class="text-xs text-gray-400 py-2">
                  No custom vocabularies uploaded
                </div>
              </div>
            </div>

            <!-- Rebuild Index -->
            <button
              class="w-full text-sm px-3 py-2 bg-yale-500 text-white rounded-lg hover:bg-yale-600 disabled:opacity-50 flex items-center justify-center gap-2"
              :disabled="vocabStore.indexStatus === 'indexing' || vocabStore.indexStatus === 'loading'"
              @click="rebuildIndex"
            >
              <font-awesome-icon v-if="vocabStore.indexStatus === 'indexing'" :icon="['fas', 'spinner']" class="animate-spin" />
              <font-awesome-icon v-else :icon="['fas', 'arrows-rotate']" />
              Rebuild Index
            </button>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Drawer>
</template>

<script setup>
import Drawer from 'primevue/drawer'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ToggleSwitch from 'primevue/toggleswitch'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import { useSettingsStore } from '../../stores/settingsStore.js'
import { useVocabularyStore } from '../../stores/vocabularyStore.js'

const visible = defineModel('visible', { type: Boolean, default: false })
const settings = useSettingsStore()
const vocabStore = useVocabularyStore()

const openAITypeOptions = [
  { label: 'OpenAI.com', value: 'openai' },
  { label: 'Azure', value: 'azure' },
]

function toggleVocabIncluded(vocab) {
  vocabStore.toggleIncluded(vocab.name)
}

async function clearVocabCache(vocab) {
  await vocabStore.clearCache(vocab.name)
}

async function loadVocab(vocab) {
  await vocabStore.cacheVocabulary(vocab.name)
}

async function uploadVocab(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    await vocabStore.addUserVocabulary(file)
  } catch (err) {
    alert(err.message)
  }
  event.target.value = ''
}

async function removeUserVocab(vocab) {
  await vocabStore.removeUserVocabulary(vocab.name)
}

function rebuildIndex() {
  vocabStore.buildSearchIndex()
}
</script>
