const PHASES = [
  { id: 'group-stage',   label: 'Fase de Grupos' },
  { id: 'jornada-3',     label: 'Jornada 3' },
  { id: 'dieciseisavos', label: 'Dieciseisavos' },
  { id: 'octavos',       label: 'Octavos de Final' },
  { id: 'cuartos',       label: 'Cuartos de Final' },
  { id: 'campeon',       label: 'Campeón' },
]

function submissionsToCsv(rows) {
  const headers = ['phaseId', 'phaseType', 'userId', 'alias', 'company', 'status', 'score', 'ip', 'referrer', 'userAgent', 'createdAt', 'predictions', 'bonusAnswers']
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.join(','),
    ...rows.map(r => {
      const preds = Array.isArray(r.predictions)
        ? r.predictions.map(p => `${p.matchId}:${p.outcome}`).join(' | ')
        : r.predictions?.teamId ?? JSON.stringify(r.predictions ?? '')
      const bonus = (r.bonusAnswers ?? []).map(a => `${a.questionId}:${a.answer}`).join(' | ')
      return [
        r.phaseId, r.phaseType, r.userId, r.alias, r.company ?? '',
        r.status, r.score ?? '', r.ip ?? '', r.referrer ?? '', r.userAgent ?? '',
        r.createdAt ? new Date(r.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '',
        preds, bonus
      ].map(escape).join(',')
    })
  ]
  return lines.join('\n')
}

function downloadCsv(content, filename) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function useMundialistaSubmissions() {
  const { $axios } = useNuxtApp()

  const submissions   = ref([])
  const total         = ref(0)
  const loading       = ref(false)
  const error         = ref('')
  const exportInfo    = ref('')
  const drawerOpen    = ref(false)
  const selected      = ref(null)
  const filterPhase   = ref('')
  const filterStatus  = ref('')
  const filterAlias   = ref('')
  const confirmDeleteOpen = ref(false)

  async function fetchSubmissions(page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      const params = { page, limit }
      if (filterPhase.value)  params.phaseId = filterPhase.value
      if (filterStatus.value) params.status  = filterStatus.value
      if (filterAlias.value)  params.alias   = filterAlias.value
      const { data } = await $axios.get('/backoffice/mundialista/submissions', { params })
      submissions.value = data.submissions
      total.value       = data.total
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar participantes'
    } finally {
      loading.value = false
    }
  }

  async function openDrawer(item) {
    drawerOpen.value = true
    loading.value = true
    try {
      const { data } = await $axios.get(`/backoffice/mundialista/submissions/${item.id}`)
      selected.value = data
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar participante'
    } finally {
      loading.value = false
    }
  }

  async function updateStatus(id, status, page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.put(`/backoffice/mundialista/submissions/${id}`, { status })
      if (selected.value?.id === id) selected.value = data
      await fetchSubmissions(page, limit)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al actualizar estado'
    } finally {
      loading.value = false
    }
  }

  function openConfirmDelete(item) {
    selected.value = item
    confirmDeleteOpen.value = true
  }

  async function confirmDelete(page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      await $axios.delete(`/backoffice/mundialista/submissions/${selected.value.id}`)
      confirmDeleteOpen.value = false
      drawerOpen.value = false
      await fetchSubmissions(page, limit)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al eliminar participante'
    } finally {
      loading.value = false
    }
  }

  const EXPORT_LIMIT = 5000

  async function exportAllCsv() {
    loading.value = true
    error.value = ''
    try {
      const params = {
        page: 1,
        limit: EXPORT_LIMIT,
        ...(filterPhase.value  ? { phaseId: filterPhase.value }  : {}),
        ...(filterStatus.value ? { status:  filterStatus.value } : {}),
        ...(filterAlias.value  ? { alias:   filterAlias.value }  : {})
      }
      const { data } = await $axios.get('/backoffice/mundialista/submissions', { params })
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(submissionsToCsv(data.submissions), `mundialista-${filterPhase.value || 'all'}-${date}.csv`)
      exportInfo.value = `CSV generado con ${data.submissions.length} registros. Límite máximo por exportación: ${EXPORT_LIMIT.toLocaleString('es-AR')}.`
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al exportar'
    } finally {
      loading.value = false
    }
  }

  return {
    PHASES,
    submissions, total, loading, error, exportInfo,
    drawerOpen, selected, filterPhase, filterStatus, filterAlias,
    confirmDeleteOpen,
    fetchSubmissions, openDrawer, updateStatus, openConfirmDelete, confirmDelete, exportAllCsv
  }
}
