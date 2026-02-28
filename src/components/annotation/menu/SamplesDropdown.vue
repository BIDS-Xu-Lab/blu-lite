<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
      @click="toggle"
    >
      <font-awesome-icon :icon="['fas', 'flask']" class="text-xs text-gray-500" />
      <span>Samples</span>
      <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-[10px] text-gray-400" />
    </button>
    <TieredMenu ref="menu" :model="items" :popup="true" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TieredMenu from 'primevue/tieredmenu'
import { useSchemaStore } from '../../../stores/schemaStore.js'
import { useFileStore } from '../../../stores/fileStore.js'

const schemaStore = useSchemaStore()
const fileStore = useFileStore()
const menu = ref()

const sampleSchema = {
  name: 'Medical NER',
  entity: [
    {
      name: 'disease',
      attrs: [
        { name: 'concept', value_type: 'text', values: [], default_value: '' },
        { name: 'comment', value_type: 'text', values: [], default_value: '' },
        { name: 'certainty', value_type: 'enum', values: ['positive', 'negated', 'possible', 'NA'], default_value: 'NA' },
      ],
    },
    {
      name: 'drug',
      attrs: [
        { name: 'concept', value_type: 'text', values: [], default_value: '' },
        { name: 'comment', value_type: 'text', values: [], default_value: '' },
        { name: 'certainty', value_type: 'enum', values: ['positive', 'negated', 'possible', 'NA'], default_value: 'NA' },
      ],
    },
    {
      name: 'symptom',
      attrs: [
        { name: 'concept', value_type: 'text', values: [], default_value: '' },
        { name: 'certainty', value_type: 'enum', values: ['positive', 'negated', 'possible', 'NA'], default_value: 'NA' },
      ],
    },
  ],
  relation: [
    { name: 'treatment', attrs: [] },
    { name: 'causes', attrs: [] },
  ],
}

const sampleFile = {
  filename: 'sample_note.json',
  content: 'The patient was diagnosed with type 2 diabetes mellitus and started on metformin 500mg twice daily. She also reports occasional headaches and dizziness. Previous medications include lisinopril for hypertension and atorvastatin for hyperlipidemia.',
  indexes: {
    '31': {
      Entity: [
        {
          id: 'E1',
          semantic: 'disease',
          begin: 31,
          end: 55,
          type: 'Entity',
          attrs: {
            concept: { id: 'A1', attrKey: 'concept', attrValue: 'E11.9', attrType: 'text', annotationValue: '', attrIcon: '' },
            certainty: { id: 'A2', attrKey: 'certainty', attrValue: 'positive', attrType: 'enum', annotationValue: '', attrIcon: '' },
          },
        },
      ],
    },
    '71': {
      Entity: [
        {
          id: 'E2',
          semantic: 'drug',
          begin: 71,
          end: 80,
          type: 'Entity',
          attrs: {
            concept: { id: 'A3', attrKey: 'concept', attrValue: 'C0025598', attrType: 'text', annotationValue: '', attrIcon: '' },
          },
        },
      ],
    },
    '128': {
      Entity: [
        { id: 'E3', semantic: 'symptom', begin: 128, end: 137, type: 'Entity', attrs: {} },
      ],
    },
    '142': {
      Entity: [
        { id: 'E4', semantic: 'symptom', begin: 142, end: 151, type: 'Entity', attrs: {} },
      ],
    },
    '182': {
      Entity: [
        { id: 'E5', semantic: 'drug', begin: 182, end: 192, type: 'Entity', attrs: {} },
      ],
    },
    '197': {
      Entity: [
        {
          id: 'E6',
          semantic: 'disease',
          begin: 197,
          end: 209,
          type: 'Entity',
          attrs: {
            certainty: { id: 'A4', attrKey: 'certainty', attrValue: 'positive', attrType: 'enum', annotationValue: '', attrIcon: '' },
          },
        },
      ],
    },
    '214': {
      Entity: [
        { id: 'E7', semantic: 'drug', begin: 214, end: 226, type: 'Entity', attrs: {} },
      ],
    },
    '231': {
      Entity: [
        { id: 'E8', semantic: 'disease', begin: 231, end: 245, type: 'Entity', attrs: {} },
      ],
    },
  },
}

const items = ref([
  {
    label: 'Load Sample Schema + Data',
    icon: 'pi pi-database',
    command: () => {
      schemaStore.loadSchema(sampleSchema)
      fileStore.files = [{ ...sampleFile, _dirty: false }]
      fileStore.activeFileIndex = 0
    },
  },
])

function toggle(event) {
  menu.value.toggle(event)
}
</script>
