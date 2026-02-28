<template>
  <div class="flex items-center gap-2 px-3 h-full">
    <SchemaMenu />
    <div class="w-px h-5 bg-gray-200"></div>
    <FileMenu />
    <SaveAllButton />
    <div class="w-px h-5 bg-gray-200"></div>
    <SearchInput />
    <div class="w-px h-5 bg-gray-200"></div>
    <MagicWandButton />
    <div class="w-px h-5 bg-gray-200"></div>
    <ToggleButtons />
    <div class="w-px h-5 bg-gray-200"></div>
    <SamplesDropdown />
    <div class="w-px h-5 bg-gray-200"></div>
    <HelpMenu />
  </div>
</template>

<script setup>
import FileMenu from './FileMenu.vue'
import SaveAllButton from './SaveAllButton.vue'
import SchemaMenu from './SchemaMenu.vue'
import SearchInput from './SearchInput.vue'
import MagicWandButton from './MagicWandButton.vue'
import ToggleButtons from './ToggleButtons.vue'
import SamplesDropdown from './SamplesDropdown.vue'
import HelpMenu from './HelpMenu.vue'
</script>
