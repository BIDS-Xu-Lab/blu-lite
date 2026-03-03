<template>
  <div class="guideline-editor h-full flex flex-col">
    <div ref="editorContainer" class="flex-1 overflow-hidden"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { useSchemaEditorStore } from '../../stores/schemaEditorStore.js'

const editorStore = useSchemaEditorStore()
const editorContainer = ref(null)
let quill = null
let ignoreChange = false

onMounted(() => {
  quill = new Quill(editorContainer.value, {
    theme: 'snow',
    placeholder: 'Write annotation guidelines here...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link'],
        ['clean'],
      ],
    },
  })

  // Load existing guideline content
  if (editorStore.draft?.guideline) {
    ignoreChange = true
    quill.root.innerHTML = editorStore.draft.guideline
    ignoreChange = false
  }

  // Sync changes back to store
  quill.on('text-change', () => {
    if (ignoreChange) return
    const html = quill.root.innerHTML
    // Quill sets empty content to <p><br></p>
    const isEmpty = html === '<p><br></p>' || html === ''
    editorStore.setGuideline(isEmpty ? '' : html)
  })
})

// Watch for draft changes (e.g. when user clicks "New" or loads a different schema)
watch(() => editorStore.draft, (newDraft) => {
  if (!quill) return
  ignoreChange = true
  if (newDraft?.guideline) {
    quill.root.innerHTML = newDraft.guideline
  } else {
    quill.setText('')
  }
  ignoreChange = false
}, { deep: false })

onBeforeUnmount(() => {
  quill = null
})
</script>

<style scoped>
.guideline-editor :deep(.ql-container) {
  font-size: 0.875rem;
  border-bottom-left-radius: 0.375rem;
  border-bottom-right-radius: 0.375rem;
}

.guideline-editor :deep(.ql-toolbar) {
  border-top-left-radius: 0.375rem;
  border-top-right-radius: 0.375rem;
}

.guideline-editor :deep(.ql-editor) {
  min-height: 200px;
}
</style>
