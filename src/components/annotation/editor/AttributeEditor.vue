<template>
  <Dialog
    v-model:visible="dialogVisible"
    header="Edit Attributes"
    :modal="true"
    :style="{ width: '480px' }"
    :closable="true"
    @hide="onClose"
  >
    <div v-if="annotationStore.editingEntity" class="space-y-4">
      <div class="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
        <span
          class="px-2 py-0.5 rounded text-xs font-semibold"
          :style="labelStyle"
        >
          {{ annotationStore.editingEntity.semantic }}
        </span>
        <span class="text-xs text-gray-400">
          [{{ annotationStore.editingEntity.begin }}:{{ annotationStore.editingEntity.end }}]
        </span>
        <span class="text-sm text-gray-600">
          "{{ entityText }}"
        </span>
      </div>

      <!-- Schema-defined attributes -->
      <div
        v-for="attr in schemaAttrs"
        :key="attr.name"
        class="flex items-start gap-3"
      >
        <label class="text-sm text-gray-600 w-24 pt-1.5 text-right flex-shrink-0">{{ attr.name }}</label>
        <div class="flex-1">
          <select
            v-if="attr.value_type === 'enum'"
            class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-yale-300"
            :value="getAttrValue(attr.name)"
            @change="setAttrValue(attr.name, $event.target.value)"
          >
            <option value="">-- select --</option>
            <option v-for="v in attr.values" :key="v" :value="v">{{ v }}</option>
          </select>
          <input
            v-else
            type="text"
            class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-yale-300"
            :value="getAttrValue(attr.name)"
            @input="setAttrValue(attr.name, $event.target.value)"
            :placeholder="attr.name"
          />
        </div>
      </div>

      <!-- Custom attributes -->
      <div class="border-t border-gray-100 pt-3 mt-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Attributes</span>
          <button
            class="text-xs text-yale-500 hover:text-yale-600 flex items-center gap-1"
            @click="addCustomAttr"
          >
            <font-awesome-icon :icon="['fas', 'plus']" class="text-[10px]" />
            Add
          </button>
        </div>
        <div
          v-for="(ca, idx) in customAttrs"
          :key="idx"
          class="flex items-center gap-2 mb-2"
        >
          <input
            type="text"
            class="w-28 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-yale-300"
            v-model="ca.key"
            placeholder="Key"
          />
          <input
            type="text"
            class="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-yale-300"
            v-model="ca.value"
            placeholder="Value"
          />
          <button
            class="p-1 text-gray-400 hover:text-red-500"
            @click="removeCustomAttr(idx)"
          >
            <font-awesome-icon :icon="['fas', 'xmark']" class="text-xs" />
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="px-4 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 mr-2"
        @click="dialogVisible = false"
      >
        Cancel
      </button>
      <button
        class="px-4 py-1.5 text-sm bg-yale-500 text-white rounded hover:bg-yale-600"
        @click="save"
      >
        Save
      </button>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import { useAnnotationStore } from '../../../stores/annotationStore.js'
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useFileStore } from '../../../stores/fileStore.js'

const annotationStore = useAnnotationStore()
const schemaStore = useSchemaStore()
const fileStore = useFileStore()

const dialogVisible = ref(false)
const customAttrs = ref([])

const schemaAttrs = computed(() => {
  if (!annotationStore.editingEntity) return []
  return schemaStore.getEntityAttrs(annotationStore.editingEntity.semantic)
})

const labelStyle = computed(() => {
  if (!annotationStore.editingEntity) return {}
  const color = schemaStore.getEntityColor(annotationStore.editingEntity.semantic)
  return {
    backgroundColor: color.bg,
    color: color.text,
    border: `1px solid ${color.border}`,
  }
})

const entityText = computed(() => {
  if (!annotationStore.editingEntity || !fileStore.activeFile) return ''
  const { begin, end } = annotationStore.editingEntity
  return fileStore.activeFile.content.slice(begin, end)
})

const schemaAttrNames = computed(() => new Set(schemaAttrs.value.map((a) => a.name)))

function getAttrValue(attrName) {
  const attr = annotationStore.editingEntity?.attrs?.[attrName]
  return attr?.attrValue ?? ''
}

function setAttrValue(attrName, value) {
  if (!annotationStore.editingOffset) return
  annotationStore.updateEntityAttribute(
    annotationStore.editingOffset,
    annotationStore.editingEntityIndex,
    attrName,
    value,
  )
}

function addCustomAttr() {
  customAttrs.value.push({ key: '', value: '' })
}

function removeCustomAttr(idx) {
  const ca = customAttrs.value[idx]
  if (ca.key && annotationStore.editingOffset) {
    annotationStore.removeEntityAttribute(
      annotationStore.editingOffset,
      annotationStore.editingEntityIndex,
      ca.key,
    )
  }
  customAttrs.value.splice(idx, 1)
}

function save() {
  // Save custom attributes
  for (const ca of customAttrs.value) {
    if (ca.key.trim() && annotationStore.editingOffset) {
      annotationStore.updateEntityAttribute(
        annotationStore.editingOffset,
        annotationStore.editingEntityIndex,
        ca.key.trim(),
        ca.value,
      )
    }
  }
  dialogVisible.value = false
  annotationStore.clearEditingEntity()
}

function onClose() {
  annotationStore.clearEditingEntity()
  customAttrs.value = []
}

function openEditor() {
  if (annotationStore.editingEntity) {
    // Load existing custom attrs (those not in schema)
    const entity = annotationStore.editingEntity
    customAttrs.value = []
    if (entity.attrs) {
      for (const [key, val] of Object.entries(entity.attrs)) {
        if (!schemaAttrNames.value.has(key)) {
          customAttrs.value.push({ key, value: val.attrValue || '' })
        }
      }
    }
    dialogVisible.value = true
  }
}

onMounted(() => {
  window.addEventListener('open-attribute-editor', openEditor)
})

onUnmounted(() => {
  window.removeEventListener('open-attribute-editor', openEditor)
})
</script>
