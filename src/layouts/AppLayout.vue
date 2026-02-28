<template>
  <div class="app-layout">
    <AppSidebar class="app-sidebar" />
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import AppSidebar from '../components/common/AppSidebar.vue'
</script>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: 4rem 1fr;
  height: 100vh;
  overflow: hidden;
}

.app-sidebar {
  grid-row: 1 / -1;
}

.app-main {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}
</style>
