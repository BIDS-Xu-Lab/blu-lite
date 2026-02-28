<template>
  <div
    class="flex items-center justify-between px-3 py-1.5 cursor-pointer border-b border-gray-50 transition-colors group"
    :class="active ? 'bg-yale-50 border-l-2 border-l-yale-400' : 'hover:bg-gray-50 border-l-2 border-l-transparent'"
    @click="$emit('select')"
  >
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <font-awesome-icon
        :icon="['fas', 'file-lines']"
        class="text-xs flex-shrink-0"
        :class="active ? 'text-yale-400' : 'text-gray-300'"
      />
      <span class="text-sm truncate" :class="active ? 'text-yale-600 font-medium' : 'text-gray-700'">
        {{ displayName }}
      </span>
      <span v-if="file._dirty" class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved changes"></span>
    </div>
    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-yale-500 transition-colors"
        title="Save"
        @click.stop="$emit('save')"
      >
        <font-awesome-icon :icon="['fas', 'floppy-disk']" class="text-xs" />
      </button>
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-red-500 transition-colors"
        title="Remove from list"
        @click.stop="$emit('delete')"
      >
        <font-awesome-icon :icon="['fas', 'xmark']" class="text-xs" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  file: { type: Object, required: true },
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
})

defineEmits(['select', 'save', 'delete'])

const displayName = computed(() => {
  const name = props.file.filename || ''
  return name.split('/').pop()
})
</script>
