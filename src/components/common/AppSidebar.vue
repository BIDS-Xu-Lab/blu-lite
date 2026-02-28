<template>
  <aside class="flex flex-col justify-between bg-yale-500 text-white h-full">
    <div class="flex flex-col items-center pt-3 gap-1">
      <router-link to="/" class="sidebar-btn mb-2" v-tooltip.right="'Home'">
        <span class="text-lg font-bold">B</span>
      </router-link>
      <div class="w-6 border-t border-yale-300 opacity-40 mb-1"></div>
      <router-link
        to="/annotate"
        class="sidebar-btn"
        :class="{ active: $route.name === 'annotate' }"
        v-tooltip.right="'Annotation'"
      >
        <font-awesome-icon :icon="['fas', 'highlighter']" />
      </router-link>
      <router-link
        to="/evaluate"
        class="sidebar-btn"
        :class="{ active: $route.name === 'evaluate' }"
        v-tooltip.right="'Evaluation'"
      >
        <font-awesome-icon :icon="['fas', 'scale-balanced']" />
      </router-link>
      <router-link
        to="/schema"
        class="sidebar-btn"
        :class="{ active: $route.name === 'schema' }"
        v-tooltip.right="'Schema Editor'"
      >
        <font-awesome-icon :icon="['fas', 'puzzle-piece']" />
      </router-link>
    </div>
    <div class="flex flex-col items-center pb-3 gap-1">
      <button class="sidebar-btn" v-tooltip.right="'Settings'" @click="settingsVisible = true">
        <font-awesome-icon :icon="['fas', 'gear']" />
      </button>
      <button class="sidebar-btn" v-tooltip.right="'User Profile'">
        <font-awesome-icon :icon="['fas', 'user']" />
      </button>
    </div>
  </aside>

  <SettingsDrawer v-model:visible="settingsVisible" />
</template>

<script setup>
import { ref } from 'vue'
import SettingsDrawer from './SettingsDrawer.vue'

const settingsVisible = ref(false)
</script>

<style scoped>
.sidebar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  background: none;
  text-decoration: none;
}

.sidebar-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.sidebar-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
</style>
