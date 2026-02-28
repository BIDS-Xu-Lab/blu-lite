<template>
  <div class="flex items-center gap-2 px-3 h-full">
    <FileMenu />
    <div class="w-px h-5 bg-gray-200"></div>
    <SchemaMenu />
    <div class="w-px h-5 bg-gray-200"></div>
    <SearchInput />
    <div class="w-px h-5 bg-gray-200"></div>
    <MagicWandButton />
    <div class="w-px h-5 bg-gray-200"></div>
    <ToggleButtons />
    <div class="flex-1"></div>
    <SamplesDropdown />
  </div>
</template>

<script setup>
import FileMenu from './FileMenu.vue'
import SchemaMenu from './SchemaMenu.vue'
import SearchInput from './SearchInput.vue'
import MagicWandButton from './MagicWandButton.vue'
import ToggleButtons from './ToggleButtons.vue'
import SamplesDropdown from './SamplesDropdown.vue'
</script>
