<template>
  <Drawer v-model:visible="visible" position="left" header="Settings" :style="{ width: '400px' }">
    <Tabs value="general">
      <TabList>
        <Tab value="general">General</Tab>
        <Tab value="agent">Agent</Tab>
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

const visible = defineModel('visible', { type: Boolean, default: false })
const settings = useSettingsStore()

const openAITypeOptions = [
  { label: 'OpenAI.com', value: 'openai' },
  { label: 'Azure', value: 'azure' },
]
</script>
