import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { validateAnnotationFile } from '../utils/validators.js'
import { txtToAnnotationJson } from '../utils/fileConverters.js'

export const useFileStore = defineStore('files', () => {
  const directoryHandle = ref(null)
  const files = ref([])
  const activeFileIndex = ref(-1)
  const sortField = ref('filename')
  const sortOrder = ref('asc')

  const activeFile = computed(() =>
    activeFileIndex.value >= 0 ? files.value[activeFileIndex.value] : null,
  )

  const totalFiles = computed(() => files.value.length)

  const sortedFiles = computed(() => {
    const sorted = [...files.value]
    sorted.sort((a, b) => {
      const aVal = a[sortField.value] || ''
      const bVal = b[sortField.value] || ''
      const cmp = aVal.localeCompare(bVal)
      return sortOrder.value === 'asc' ? cmp : -cmp
    })
    return sorted
  })

  async function loadDirectory() {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    directoryHandle.value = handle
    const loadedFiles = []

    for await (const entry of handle.values()) {
      if (entry.kind !== 'file') continue
      const name = entry.name.toLowerCase()

      if (name.endsWith('.txt')) {
        const file = await entry.getFile()
        const text = await file.text()
        const annotationData = txtToAnnotationJson(entry.name, text)

        // Write the json file
        const jsonName = entry.name.replace(/\.txt$/, '.json')
        const jsonHandle = await handle.getFileHandle(jsonName, { create: true })
        const writable = await jsonHandle.createWritable()
        await writable.write(JSON.stringify(annotationData, null, 2))
        await writable.close()

        // Delete the txt file
        await handle.removeEntry(entry.name)

        annotationData._dirty = false
        loadedFiles.push(annotationData)
      } else if (name.endsWith('.json')) {
        try {
          const file = await entry.getFile()
          const text = await file.text()
          const parsed = JSON.parse(text)
          if (validateAnnotationFile(parsed)) {
            parsed._dirty = false
            loadedFiles.push(parsed)
          }
        } catch {
          // Skip invalid JSON files
        }
      }
    }

    files.value = loadedFiles
    activeFileIndex.value = loadedFiles.length > 0 ? 0 : -1
  }

  function setActiveFile(index) {
    activeFileIndex.value = index
  }

  function markDirty(index) {
    if (index >= 0 && index < files.value.length) {
      files.value[index]._dirty = true
    }
  }

  function markActiveDirty() {
    if (activeFileIndex.value >= 0) {
      files.value[activeFileIndex.value]._dirty = true
    }
  }

  async function saveFile(index) {
    if (!directoryHandle.value || index < 0 || index >= files.value.length) return
    const fileData = files.value[index]
    const fname = fileData.filename.endsWith('.json')
      ? fileData.filename.split('/').pop()
      : fileData.filename.replace(/\.txt$/, '.json').split('/').pop()

    const fileHandle = await directoryHandle.value.getFileHandle(fname, { create: true })
    const writable = await fileHandle.createWritable()
    const { _dirty, ...cleanData } = fileData
    await writable.write(JSON.stringify(cleanData, null, 2))
    await writable.close()
    files.value[index]._dirty = false
  }

  async function saveActiveFile() {
    if (activeFileIndex.value >= 0) {
      await saveFile(activeFileIndex.value)
    }
  }

  async function dumpAllFiles() {
    if (!directoryHandle.value) return
    for (let i = 0; i < files.value.length; i++) {
      if (files.value[i]._dirty) {
        await saveFile(i)
      }
    }
  }

  function deleteFile(index) {
    if (index < 0 || index >= files.value.length) return
    files.value.splice(index, 1)
    if (activeFileIndex.value >= files.value.length) {
      activeFileIndex.value = files.value.length - 1
    }
    if (files.value.length === 0) {
      activeFileIndex.value = -1
    }
  }

  function setSorting(field, order) {
    sortField.value = field
    sortOrder.value = order
  }

  return {
    directoryHandle,
    files,
    activeFileIndex,
    sortField,
    sortOrder,
    activeFile,
    totalFiles,
    sortedFiles,
    loadDirectory,
    setActiveFile,
    markDirty,
    markActiveDirty,
    saveFile,
    saveActiveFile,
    dumpAllFiles,
    deleteFile,
    setSorting,
  }
})
