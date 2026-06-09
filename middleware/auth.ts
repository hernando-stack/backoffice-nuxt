export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return
  if (typeof window === 'undefined') return
  const token = localStorage.getItem('bo_token')
  if (!token) return navigateTo('/login')
})
