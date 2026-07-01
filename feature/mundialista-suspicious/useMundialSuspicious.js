import * as XLSX from 'xlsx'

const EXPORT_LIMIT = 5000

export function useMundialSuspicious() {
  const { $axios } = useNuxtApp()

  const suspects = ref([])
  const loading = ref(false)
  const running = ref(false)
  const exporting = ref(false)
  const error = ref('')
  const total = ref(0)
  const page = ref(1)
  const limit = 20

  const filterCode = ref(null)
  const filterSeverity = ref(null)
  const ipDupWarning = ref(null) // { count, submissionsTotal, ratio } | null when IP_DUP flags most submissions

  // Chequea si la señal IP_DUP por sí sola está marcando "casi todo" como sospechoso
  // (típico de NAT de operadores móviles, no necesariamente trampa).
  async function checkIpDupRatio(submissionsTotal) {
    if (!submissionsTotal) { ipDupWarning.value = null; return }
    try {
      const { data } = await $axios.get('/backoffice/mundialista/suspicious', { params: { code: 'IP_DUP', limit: 1 } })
      const count = data.total ?? 0
      const ratio = count / submissionsTotal
      ipDupWarning.value = ratio >= 0.75 ? { count, submissionsTotal, ratio } : null
    } catch {
      // chequeo secundario, no crítico — si falla no bloquea el flujo principal
    }
  }

  async function fetchSuspects(p = 1) {
    loading.value = true
    error.value = ''
    page.value = p
    try {
      const { data } = await $axios.get('/backoffice/mundialista/suspicious', {
        params: { page: p, limit, code: filterCode.value || undefined, severity: filterSeverity.value || undefined }
      })
      suspects.value = data.suspects ?? data.data ?? []
      total.value = data.total ?? suspects.value.length
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar sospechosos'
    } finally {
      loading.value = false
    }
  }

  async function runDetection(submissionsTotal) {
    running.value = true
    error.value = ''
    try {
      await $axios.post('/backoffice/mundialista/suspicious')
      await fetchSuspects(1)
      await checkIpDupRatio(submissionsTotal)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al ejecutar detección'
    } finally {
      running.value = false
    }
  }

  async function exportExcel() {
    exporting.value = true
    error.value = ''
    try {
      const { data } = await $axios.get('/backoffice/mundialista/suspicious', {
        params: { page: 1, limit: EXPORT_LIMIT, code: filterCode.value || undefined, severity: filterSeverity.value || undefined }
      })
      const rows = (data.suspects ?? []).map((s) => ({
        alias: s.alias,
        fase: s.phaseId,
        ip: s.ip ?? '',
        severidad: s.severity,
        razones: s.reason.map((r) => r.label).join(' | '),
        detalle: s.reason.map((r) => r.detail).filter(Boolean).join(' | ')
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sospechosos')
      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `mundialista-sospechosos-${date}.xlsx`)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al exportar'
    } finally {
      exporting.value = false
    }
  }

  return {
    suspects, loading, running, exporting, error, total, page, limit,
    filterCode, filterSeverity, ipDupWarning,
    fetchSuspects, runDetection, exportExcel
  }
}
