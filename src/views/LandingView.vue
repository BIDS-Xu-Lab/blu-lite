<template>
  <div class="min-h-screen flex flex-col">
    <!-- Nav -->
    <nav class="flex items-center justify-between px-8 py-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-yale-500 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">B</span>
        </div>
        <span class="text-xl font-semibold text-yale-500">Blu Lite</span>
      </div>
      <router-link
        to="/annotate"
        class="px-4 py-2 bg-yale-500 text-white text-sm rounded-lg hover:bg-yale-600 transition-colors"
      >
        Get Started
      </router-link>
    </nav>

    <!-- Hero -->
    <section class="flex-1 flex flex-col items-center justify-center px-8 pb-12 pt-4">
      <div class="max-w-3xl text-center mb-12">
        <h1 class="text-5xl font-bold text-yale-500 mb-4 tracking-tight">
          Text Annotation,<br>Simplified.
        </h1>
        <p class="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          A lightweight tool for entity annotation, relation annotation, and concept normalization.
          All data stays on your local disk.
        </p>
        <div class="flex items-center justify-center gap-3">
          <router-link
            to="/annotate"
            class="px-6 py-3 bg-yale-500 text-white rounded-lg hover:bg-yale-600 transition-colors font-medium"
          >
            <font-awesome-icon :icon="['fas', 'highlighter']" class="mr-2" />
            Start Annotating
          </router-link>
          <!-- <router-link
            to="/evaluate"
            class="px-6 py-3 border border-yale-200 text-yale-500 rounded-lg hover:bg-yale-50 transition-colors font-medium"
          >
            <font-awesome-icon :icon="['fas', 'scale-balanced']" class="mr-2" />
            Evaluate
          </router-link> -->
        </div>
      </div>

      <!-- Features Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl w-full">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-3" :class="feature.bgClass">
            <font-awesome-icon :icon="feature.icon" :class="feature.iconClass" />
          </div>
          <h3 class="font-semibold text-gray-800 mb-1 text-sm">{{ feature.title }}</h3>
          <p class="text-xs text-gray-500 leading-relaxed">{{ feature.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
      Blu Lite &mdash; Local-first text annotation tool. Apache 2.0 Licensed.
    </footer>
  </div>
</template>

<script setup>
const features = [
  {
    title: 'Entity Annotation',
    desc: 'Highlight text spans and label them with schema-defined entity types, with full attribute support.',
    icon: ['fas', 'highlighter'],
    bgClass: 'bg-blue-50',
    iconClass: 'text-blue-500',
  },
  {
    title: 'Schema Driven',
    desc: 'Define entities, relations, and attributes in a JSON schema. The tool adapts to your project.',
    icon: ['fas', 'sitemap'],
    bgClass: 'bg-emerald-50',
    iconClass: 'text-emerald-500',
  },
  {
    title: 'Local-First',
    desc: 'All data stays on your disk. Read and write files directly using the File System Access API.',
    icon: ['fas', 'hard-drive'],
    bgClass: 'bg-amber-50',
    iconClass: 'text-amber-500',
  },
  {
    title: 'Inter-Annotator Evaluation',
    desc: 'Compare annotations from multiple reviewers side by side to measure agreement.',
    icon: ['fas', 'scale-balanced'],
    bgClass: 'bg-purple-50',
    iconClass: 'text-purple-500',
  },
]
</script>
