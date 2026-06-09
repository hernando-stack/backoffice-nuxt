import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'greenApple',
      themes: {
        greenApple: {
          dark: false,
          colors: {
            primary: '#7DC242',
            'primary-darken-1': '#5A9E28',
            secondary: '#4CAF50',
            background: '#FFFFFF',
            surface: '#F5F5F5',
            error: '#B00020',
            success: '#7DC242',
            warning: '#FB8C00',
            info: '#1976D2',
          }
        }
      }
    }
  })
  nuxtApp.vueApp.use(vuetify)
})
