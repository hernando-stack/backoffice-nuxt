export function useQuinielaSuspicious() {
  const { $axios } = useNuxtApp()

  const entries = ref([])
  const total = ref(0)
  const loading = ref(false)
  const detecting = ref(false)
  const error = ref('')
  const scannedAt = ref(null)

  async function fetchSuspicious() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.get('/backoffice/quiniela/suspicious')
      entries.value = data.entries ?? []
      total.value = data.total ?? 0
      if (data.entries?.length) scannedAt.value = data.entries[0].scannedAt
    } catch (e) {
      error.value = e.response?.data?.error ?? e.message ?? 'Error al cargar sospechosos'
    } finally {
      loading.value = false
    }
  }

  async function runDetection() {
    detecting.value = true
    error.value = ''
    try {
      const { data } = await $axios.post('/backoffice/quiniela/suspicious')
      scannedAt.value = data.scannedAt
      await fetchSuspicious()
    } catch (e) {
      error.value = e.response?.data?.error ?? e.message ?? 'Error al ejecutar detección'
    } finally {
      detecting.value = false
    }
  }

  return { entries, total, loading, detecting, error, scannedAt, fetchSuspicious, runDetection }
}
