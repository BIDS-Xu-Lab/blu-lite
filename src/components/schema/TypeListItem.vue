<template>
  <div
    class="flex items-center justify-between px-3 py-1.5 cursor-pointer border-b border-gray-50 transition-colors group"
    :class="active ? 'bg-yale-50 border-l-2 border-l-yale-400' : 'hover:bg-gray-50 border-l-2 border-l-transparent'"
    @click="$emit('select')"
  >
    <div class="flex items-center gap-2 min-w-0 flex-1">
      <span
        v-if="color"
        class="w-3 h-3 rounded-sm flex-shrink-0"
        :style="{ backgroundColor: color.bg, border: '1px solid ' + color.border }"
      ></span>
      <font-awesome-icon
        v-else
        :icon="['fas', 'arrows-left-right']"
        class="text-[10px] text-gray-300 flex-shrink-0"
      />
      <span class="text-sm truncate" :class="active ? 'text-yale-600 font-medium' : 'text-gray-700'">
        {{ item.name }}
      </span>
      <span class="text-[10px] text-gray-400">({{ item.attrs?.length ?? 0 }})</span>
    </div>
    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-yale-500 transition-colors disabled:opacity-30 disabled:cursor-default"
        :disabled="isFirst"
        title="Move up"
        @click.stop="$emit('move-up')"
      >
        <font-awesome-icon :icon="['fas', 'chevron-up']" class="text-[10px]" />
      </button>
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-yale-500 transition-colors disabled:opacity-30 disabled:cursor-default"
        :disabled="isLast"
        title="Move down"
        @click.stop="$emit('move-down')"
      >
        <font-awesome-icon :icon="['fas', 'chevron-down']" class="text-[10px]" />
      </button>
      <button
        class="p-1 rounded hover:bg-white text-gray-400 hover:text-red-500 transition-colors"
        title="Remove"
        @click.stop="$emit('remove')"
      >
        <font-awesome-icon :icon="['fas', 'xmark']" class="text-xs" />
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  item: { type: Object, required: true },
  index: { type: Number, required: true },
  active: { type: Boolean, default: false },
  color: { type: Object, default: null },
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
})

defineEmits(['select', 'move-up', 'move-down', 'remove'])
</script>
