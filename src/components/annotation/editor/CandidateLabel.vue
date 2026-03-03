<template>
  <span
    class="candidate-label"
    :style="labelStyle"
    @click.stop="handleAccept"
  >
    {{ candidate.semantic }}
    <font-awesome-icon :icon="['fas', 'plus-circle']" class="text-[0.5rem] opacity-60" />
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { useCandidateStore } from '../../../stores/candidateStore.js'

const props = defineProps({
  candidate: { type: Object, required: true },
  color: { type: Object, required: true },
})

const candidateStore = useCandidateStore()

const labelStyle = computed(() => ({
  backgroundColor: 'transparent',
  color: props.color.text,
  border: `1px dashed ${props.color.border}`,
}))

function handleAccept() {
  candidateStore.acceptCandidate(props.candidate.id)
}
</script>
