<template>
  <Drawer v-model:visible="visible" position="left" header="Settings" :style="{ width: '460px' }">
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
            <div class="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-semibold text-gray-800">Current Source: {{ vocabStore.indexName }}</div>
                  <div class="text-xs text-gray-500 mt-0.5">Vocabulary DBs are cached in OPFS and reused across sessions.</div>
                </div>
                <span
                  v-if="vocabStore.indexStatus === 'ready'"
                  class="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-md"
                >
                  Ready
                </span>
                <span
                  v-else-if="vocabStore.indexStatus === 'loading'"
                  class="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-md"
                >
                  Loading {{ vocabStore.loadProgress.percent }}%
                </span>
                <span
                  v-else-if="vocabStore.indexStatus === 'error'"
                  class="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-md"
                >
                  Error
                </span>
                <span
                  v-else
                  class="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-md"
                >
                  Idle
                </span>
              </div>

              <div class="mt-3 text-xs text-gray-600">
                <div v-if="vocabStore.indexStatus === 'ready'">
                  Records: {{ vocabStore.indexedDocCount.toLocaleString() }}
                </div>
                <div v-else-if="vocabStore.indexStatus === 'error'" class="text-red-600">
                  {{ vocabStore.indexError || 'Vocabulary initialization failed.' }}
                </div>
                <div v-else>
                  Records: --
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-gray-700">Active Vocabulary Source</label>
              <Select
                :model-value="vocabStore.selectedSourceId"
                :options="sourceOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                :disabled="vocabStore.indexStatus === 'loading' || vocabStore.isManagingSources"
                @update:model-value="onSelectSource"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                class="text-xs px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                :disabled="vocabStore.indexStatus === 'loading' || vocabStore.isClearingCache"
                @click="reloadCurrentSource"
              >
                {{ vocabStore.isClearingCache ? 'Reloading...' : 'Reload Current Source' }}
              </button>
              <button
                class="text-xs px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                :disabled="vocabStore.indexStatus === 'loading' || vocabStore.isManagingSources"
                @click="importLocalDb"
              >
                Import Local DB
              </button>
              <input ref="fileInputRef" type="file" accept=".db" class="hidden" @change="onFileInputChange" />
            </div>

            <div class="p-3 rounded-md border border-gray-200 bg-white">
              <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Add From URL</div>
              <div class="flex flex-col gap-2">
                <InputText
                  v-model="urlDisplayName"
                  class="w-full"
                  placeholder="Display name (optional)"
                />
                <InputText
                  v-model="urlValue"
                  class="w-full"
                  placeholder="https://example.com/vocab.db"
                />
                <button
                  class="text-xs px-3 py-2 rounded-md bg-yale-500 text-white hover:bg-yale-600 disabled:opacity-50"
                  :disabled="!urlValue.trim() || addingUrl || vocabStore.indexStatus === 'loading'"
                  @click="addFromUrl"
                >
                  {{ addingUrl ? 'Adding...' : 'Add URL Source & Load' }}
                </button>
              </div>
            </div>

            <div class="p-3 rounded-md border border-gray-200 bg-white">
              <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Cached Sources</div>
              <div class="flex flex-col gap-2 max-h-56 overflow-y-auto">
                <div
                  v-for="source in vocabStore.sources"
                  :key="source.id"
                  class="flex items-center justify-between gap-2 text-xs border border-gray-100 rounded-md p-2"
                >
                  <div class="min-w-0">
                    <div class="font-medium text-gray-700 truncate">{{ source.name }}</div>
                    <div class="text-gray-500 truncate">
                      {{ source.opfsName }} · {{ source.cached ? 'cached' : 'not cached' }}
                    </div>
                  </div>
                  <button
                    v-if="!source.locked"
                    class="px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    :disabled="vocabStore.isManagingSources || vocabStore.indexStatus === 'loading'"
                    @click="removeSource(source.id)"
                  >
                    Delete
                  </button>
                  <span v-else class="text-[11px] text-gray-400">Default</span>
                </div>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </Drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
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

const fileInputRef = ref(null)
const addingUrl = ref(false)
const urlDisplayName = ref('')
const urlValue = ref('')

const openAITypeOptions = [
  { label: 'OpenAI.com', value: 'openai' },
  { label: 'Azure', value: 'azure' },
]

const sourceOptions = computed(() =>
  vocabStore.sources.map((source) => ({
    value: source.id,
    label: `${source.name}${source.cached ? '' : ' (not cached)'}`,
  })),
)

async function onSelectSource(sourceId) {
  if (!sourceId) return
  try {
    await vocabStore.setSelectedSource(sourceId, true)
  } catch (err) {
    console.error(err)
  }
}

async function reloadCurrentSource() {
  try {
    await vocabStore.clearVocabularyCache()
    await vocabStore.initVocabulary()
  } catch (err) {
    console.error(err)
  }
}

async function addFromUrl() {
  if (!urlValue.value.trim()) return
  addingUrl.value = true
  try {
    await vocabStore.addUrlSource({
      url: urlValue.value.trim(),
      name: urlDisplayName.value.trim(),
    })
    urlDisplayName.value = ''
    urlValue.value = ''
  } catch (err) {
    console.error(err)
    alert(err.message)
  } finally {
    addingUrl.value = false
  }
}

async function importLocalDb() {
  try {
    if (window.showOpenFilePicker) {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: 'SQLite DB',
          accept: {
            'application/octet-stream': ['.db'],
            'application/x-sqlite3': ['.db'],
          },
        }],
      })
      const file = await handle.getFile()
      await vocabStore.addLocalSource(file)
      return
    }

    fileInputRef.value?.click()
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.error(err)
      alert(err.message || 'Failed to import local DB.')
    }
  }
}

async function onFileInputChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    await vocabStore.addLocalSource(file)
  } catch (err) {
    console.error(err)
    alert(err.message || 'Failed to import local DB.')
  }
}

async function removeSource(sourceId) {
  try {
    await vocabStore.removeSource(sourceId)
  } catch (err) {
    console.error(err)
    alert(err.message || 'Failed to remove source.')
  }
}
</script>
