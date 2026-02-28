<template>
  <div class="evaluation-view">
    <header class="border-b border-gray-200 bg-white flex items-center px-4 h-12">
      <span class="text-sm font-medium text-gray-700">
        <font-awesome-icon :icon="['fas', 'scale-balanced']" class="mr-2 text-gray-400" />
        Evaluation
      </span>
    </header>
    <div class="flex-1 flex items-center justify-center text-gray-400 text-sm">
      <div class="text-center">
        <font-awesome-icon :icon="['fas', 'scale-balanced']" class="text-4xl text-gray-300 mb-3" />
        <p>Inter-annotator evaluation coming soon</p>
        <p class="text-xs mt-1">Compare annotations from multiple reviewers</p>
      </div>
    </div>
    <footer class="border-t border-gray-200 bg-gray-50 flex items-center px-4 text-xs text-gray-500 h-5">
      <span>Evaluation View</span>
    </footer>
  </div>
</template>

<style scoped>
.evaluation-view {
  display: grid;
  grid-template-rows: 3rem 1fr 1.25rem;
  height: 100%;
  overflow: hidden;
}
</style>
