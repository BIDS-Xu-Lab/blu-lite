import { defineConfig } from 'vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

let vocabFiles = []
try {
  vocabFiles = readdirSync(resolve(__dirname, 'public/data/vocab'))
    .filter(f => f.endsWith('.tsv.zip'))
    .map(f => f.replace('.tsv.zip', ''))
} catch {
  vocabFiles = []
}

export default defineConfig({
  base: '/blu-lite/',
  plugins: [
    vue(),
    tailwindcss(),
  ],
  define: {
    __VOCAB_FILES__: JSON.stringify(vocabFiles),
  },
})
