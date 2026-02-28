import { createRouter, createWebHistory } from 'vue-router'
import LandingLayout from '../layouts/LandingLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: LandingLayout,
      children: [
        {
          path: '',
          name: 'landing',
          component: () => import('../views/LandingView.vue'),
        },
      ],
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: 'annotate',
          name: 'annotate',
          component: () => import('../views/AnnotationView.vue'),
        },
        {
          path: 'evaluate',
          name: 'evaluate',
          component: () => import('../views/EvaluationView.vue'),
        },
      ],
    },
  ],
})

export default router
