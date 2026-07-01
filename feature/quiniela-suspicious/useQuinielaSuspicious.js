import * as XLSX from 'xlsx'

const EXPORT_LIMIT = 5000

export function useQuinielaSuspicious() {
  const { $axios } = useNuxtApp()

  const entries = ref([])
  const total = ref(0)
  const loading = ref(false)
  const detecting = ref(false)
  const exporting = ref(false)
  const error = ref('')
  const scannedAt = ref(null)

  const filterCode = ref(null)
  const filterSeverity = ref(null)
  const ipDupWarning = ref(null) // { count, submissionsTotal, ratio } | null cuando IP_DUP marca casi todo

  // Chequea si la señal IP_DUP por sí sola está marcando "casi todo" como sospechoso
  // (típico de NAT de operadores móviles, no necesariamente trampa).
  async function checkIpDupRatio(submissionsTotal) {
    if (!submissionsTotal) { ipDupWarning.value = null; return }
    try {
      const { data } = await $axios.get('/backoffice/quiniela/suspicious', { params: { code: 'IP_DUP', limit: 1 } })
      const count = data.total ?? 0
      const ratio = count / submissionsTotal
      ipDupWarning.value = ratio >= 0.75 ? { count, submissionsTotal, ratio } : null
    } catch {
      // chequeo secundario, no crítico — si falla no bloquea el flujo principal
    }
  }

  async function fetchSuspicious() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.get('/backoffice/quiniela/suspicious', {
        params: { code: filterCode.value || undefined, severity: filterSeverity.value || undefined }
      })
      entries.value = data.entries ?? []
      total.value = data.total ?? 0
      if (data.entries?.length) scannedAt.value = data.entries[0].scannedAt
    } catch (e) {
      error.value = e.response?.data?.error ?? e.message ?? 'Error al cargar sospechosos'
    } finally {
      loading.value = false
    }
  }

  async function runDetection(submissionsTotal) {
    detecting.value = true
    error.value = ''
    try {
      const { data } = await $axios.post('/backoffice/quiniela/suspicious')
      scannedAt.value = data.scannedAt
      await fetchSuspicious()
      await checkIpDupRatio(submissionsTotal)
    } catch (e) {
      error.value = e.response?.data?.error ?? e.message ?? 'Error al ejecutar detección'
    } finally {
      detecting.value = false
    }
  }

  async function exportExcel() {
    exporting.value = true
    error.value = ''
    try {
      const { data } = await $axios.get('/backoffice/quiniela/suspicious', {
        params: { page: 1, limit: EXPORT_LIMIT, code: filterCode.value || undefined, severity: filterSeverity.value || undefined }
      })
      const rows = (data.entries ?? []).map((e) => ({
        alias: e.alias,
        playerId: e.playerId,
        ip: e.ip ?? '',
        severidad: e.severity,
        fecha: e.submittedAt ? new Date(e.submittedAt).toISOString() : '',
        razones: e.reasons.map((r) => r.label).join(' | '),
        detalle: e.reasons.map((r) => r.detail).filter(Boolean).join(' | ')
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sospechosos')
      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `quiniela-sospechosos-${date}.xlsx`)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al exportar'
    } finally {
      exporting.value = false
    }
  }

  return {
    entries, total, loading, detecting, exporting, error, scannedAt,
    filterCode, filterSeverity, ipDupWarning,
    fetchSuspicious, runDetection, exportExcel
  }
}
