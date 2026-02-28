import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', () => {
  // General
  const autoSave = ref(false)

  // Agent
  const openAIType = ref('openai')
  const openAIBaseUrl = ref('')
  const openAIApiKey = ref('')
  const openAIModel = ref('gpt-5.1-codex-mini')

  return {
    autoSave,
    openAIType,
    openAIBaseUrl,
    openAIApiKey,
    openAIModel,
  }
})
