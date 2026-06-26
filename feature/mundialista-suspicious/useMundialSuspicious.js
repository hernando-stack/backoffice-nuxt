export function useMundialSuspicious() {
  const { $axios } = useNuxtApp()

  const suspects = ref([])
  const loading = ref(false)
  const running = ref(false)
  const error = ref('')
  const total = ref(0)
  const page = ref(1)
  const limit = 20

  async function fetchSuspects(p = 1) {
    loading.value = true
    error.value = ''
    page.value = p
    try {
      const { data } = await $axios.get('/backoffice/mundialista/suspicious', { params: { page: p, limit } })
      suspects.value = data.suspects ?? data.data ?? []
      total.value = data.total ?? suspects.value.length
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar sospechosos'
    } finally {
      loading.value = false
    }
  }

  async function runDetection() {
    running.value = true
    error.value = ''
    try {
      await $axios.post('/backoffice/mundialista/suspicious')
      await fetchSuspects(1)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al ejecutar detección'
    } finally {
      running.value = false
    }
  }

  function reasonColor(r) {
    if (r.includes('duplicado') || r.includes('ID') || r.includes('suspendido')) return 'error'
    return 'warning'
  }

  return { suspects, loading, running, error, total, page, limit, fetchSuspects, runDetection, reasonColor }
}
