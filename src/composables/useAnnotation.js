import { useAnnotationStore } from '../stores/annotationStore.js'

export function useAnnotation() {
  const annotationStore = useAnnotationStore()

  function computeOffset(node, offset) {
    let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
    while (el && !el.dataset?.offset) {
      el = el.parentElement
    }
    if (!el) return -1

    const baseOffset = parseInt(el.dataset.offset, 10)

    if (node.nodeType === Node.TEXT_NODE) {
      return baseOffset + offset
    }
    return baseOffset
  }

  function onMouseUp(event) {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    const start = computeOffset(range.startContainer, range.startOffset)
    const end = computeOffset(range.endContainer, range.endOffset)

    if (start < 0 || end < 0 || start >= end) {
      return
    }

    const selectedText = selection.toString()
    if (!selectedText.trim()) {
      return
    }

    annotationStore.setPendingSelection({ start, end, text: selectedText })
    annotationStore.typeSelectorPosition = { x: event.clientX, y: event.clientY }
    annotationStore.showTypeSelector = true
  }

  function cancelSelection() {
    annotationStore.showTypeSelector = false
    annotationStore.clearPendingSelection()
    window.getSelection()?.removeAllRanges()
  }

  return {
    onMouseUp,
    cancelSelection,
  }
}
