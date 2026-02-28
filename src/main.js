import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'

import App from './App.vue'
import router from './router'

import './assets/styles/main.css'
import './assets/styles/annotations.css'

library.add(fas, far, fab)

const BluPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{yale.50}',
      100: '{yale.100}',
      200: '{yale.200}',
      300: '{yale.300}',
      400: '{yale.400}',
      500: '{yale.500}',
      600: '{yale.600}',
      700: '{yale.700}',
      800: '{yale.800}',
      900: '{yale.900}',
      950: '{yale.900}',
    }
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: BluPreset,
    options: {
      darkModeSelector: false,
    }
  }
})
app.use(ToastService)
app.use(ConfirmationService)

app.component('font-awesome-icon', FontAwesomeIcon)

app.mount('#app')
