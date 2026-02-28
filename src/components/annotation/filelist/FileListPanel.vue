<template>
  <div class="flex flex-col h-full border-r border-gray-200 bg-white">
    <FileListHeader />
    <div class="flex-1 overflow-y-auto">
      <div v-if="fileStore.files.length === 0" class="p-4 text-sm text-gray-400 text-center">
        No files loaded. Use File &gt; Load File(s) to open a directory.
      </div>
      <FileListItem
        v-for="(file, index) in pagedFiles"
        :key="file.filename"
        :file="file"
        :index="getActualIndex(file)"
        :active="getActualIndex(file) === fileStore.activeFileIndex"
        @select="fileStore.setActiveFile(getActualIndex(file))"
        @save="fileStore.saveFile(getActualIndex(file))"
        @delete="fileStore.deleteFile(getActualIndex(file))"
      />
    </div>
    <div v-if="fileStore.files.length > uiStore.pageSize" class="border-t border-gray-100 p-1">
      <Paginator
        :rows="uiStore.pageSize"
        :totalRecords="fileStore.files.length"
        :first="uiStore.currentPage * uiStore.pageSize"
        @page="onPageChange"
        template="PrevPageLink CurrentPageReport NextPageLink"
        :pt="{
          root: { class: 'text-xs' },
        }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Paginator from 'primevue/paginator'
import { useFileStore } from '../../../stores/fileStore.js'
import { useUiStore } from '../../../stores/uiStore.js'
import FileListHeader from './FileListHeader.vue'
import FileListItem from './FileListItem.vue'

const fileStore = useFileStore()
const uiStore = useUiStore()

const pagedFiles = computed(() => {
  const start = uiStore.currentPage * uiStore.pageSize
  return fileStore.sortedFiles.slice(start, start + uiStore.pageSize)
})

function getActualIndex(file) {
  return fileStore.files.indexOf(file)
}

function onPageChange(event) {
  uiStore.setPage(Math.floor(event.first / uiStore.pageSize))
}
</script>
