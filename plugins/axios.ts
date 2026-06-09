import axios from 'axios'

export default defineNuxtPlugin(nuxtApp => {
  const config = useRuntimeConfig()
  const instance = axios.create({ baseURL: config.public.apiUrl })

  instance.interceptors.request.use(cfg => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('bo_token')
      if (token) cfg.headers.Authorization = `Bearer ${token}`
    }
    return cfg
  })

  nuxtApp.provide('axios', instance)
})
