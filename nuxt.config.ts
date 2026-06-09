import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  ssr: false,
  css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.css'],
  build: { transpile: ['vuetify'] },
  vite: { plugins: [vuetify()] },
  runtimeConfig: {
    public: { apiUrl: process.env.API_URL ?? 'http://localhost:5000' }
  }
})
