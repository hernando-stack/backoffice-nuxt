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

  instance.interceptors.response.use(
    res => res,
    err => {
      if (err.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('bo_token')
        window.location.href = '/login'
      }
      return Promise.reject(err)
    }
  )

  nuxtApp.provide('axios', instance)
})
