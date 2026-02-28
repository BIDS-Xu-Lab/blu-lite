<template>
  <div class="grid grid-cols-[1fr_5.5rem_1fr_7rem_auto] gap-2 items-start px-2 py-1.5 border-b border-gray-50 group hover:bg-gray-50 rounded">
    <!-- Name -->
    <input
      type="text"
      :value="attr.name"
      @input="$emit('update', { name: $event.target.value })"
      class="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-yale-300 w-full"
      placeholder="attr name"
    />

    <!-- Value Type -->
    <select
      :value="attr.value_type"
      @change="onTypeChange($event.target.value)"
      class="text-sm border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-yale-300 w-full"
    >
      <option value="text">text</option>
      <option value="enum">enum</option>
    </select>

    <!-- Values (enum chips) -->
    <div v-if="attr.value_type === 'enum'" class="flex flex-wrap gap-1 items-center min-h-[1.75rem]">
      <span
        v-for="(val, i) in attr.values"
        :key="i"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-xs rounded"
      >
        {{ val }}
        <button
          class="text-gray-400 hover:text-red-500"
          @click="removeValue(i)"
        >
          <font-awesome-icon :icon="['fas', 'xmark']" class="text-[9px]" />
        </button>
      </span>
      <input
        ref="addValueInput"
        type="text"
        class="text-xs border border-dashed border-gray-300 rounded px-1.5 py-0.5 w-16 focus:outline-none focus:border-yale-300"
        placeholder="+ add"
        @keydown.enter.prevent="addValue"
      />
    </div>
    <span v-else class="text-xs text-gray-300 italic py-1">n/a</span>

    <!-- Default Value -->
    <select
      v-if="attr.value_type === 'enum' && attr.values?.length"
      :value="attr.default_value"
      @change="$emit('update', { default_value: $event.target.value })"
      class="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-yale-300 w-full"
    >
      <option value="">-- none --</option>
      <option v-for="v in attr.values" :key="v" :value="v">{{ v }}</option>
    </select>
    <input
      v-else
      type="text"
      :value="attr.default_value"
      @input="$emit('update', { default_value: $event.target.value })"
      class="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:border-yale-300 w-full"
      placeholder="default"
    />

    <!-- Actions -->
    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-yale-500 transition-colors disabled:opacity-30 disabled:cursor-default"
        :disabled="isFirst"
        title="Move up"
        @click="$emit('move-up')"
      >
        <font-awesome-icon :icon="['fas', 'chevron-up']" class="text-[10px]" />
      </button>
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-yale-500 transition-colors disabled:opacity-30 disabled:cursor-default"
        :disabled="isLast"
        title="Move down"
        @click="$emit('move-down')"
      >
        <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-[10px]" />
      </button>
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-red-500 transition-colors"
        title="Remove"
        @click="$emit('remove')"
      >
        <font-awesome-icon :icon="['fas', 'xmark']" class="text-xs" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  attr: { type: Object, required: true },
  index: { type: Number, required: true },
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
})

const emit = defineEmits(['update', 'remove', 'move-up', 'move-down'])

const addValueInput = ref(null)

function onTypeChange(newType) {
  const updates = { value_type: newType }
  if (newType === 'text') {
    updates.values = []
    updates.default_value = ''
  }
  emit('update', updates)
}

function addValue() {
  const input = addValueInput.value
  const val = input.value.trim()
  if (!val) return
  if (props.attr.values?.includes(val)) {
    input.value = ''
    return
  }
  const newValues = [...(props.attr.values || []), val]
  emit('update', { values: newValues })
  input.value = ''
}

function removeValue(index) {
  const newValues = [...props.attr.values]
  const removed = newValues.splice(index, 1)[0]
  const updates = { values: newValues }
  if (props.attr.default_value === removed) {
    updates.default_value = ''
  }
  emit('update', updates)
}
</script>
