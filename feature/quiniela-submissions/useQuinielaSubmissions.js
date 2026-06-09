function toCompany(playerId) {
  if (!playerId) return ''
  const idx = playerId.indexOf('_')
  return idx === -1 ? playerId : playerId.substring(0, idx)
}

const GROUP_KEYS = ['group-a','group-b','group-c','group-d','group-e','group-f','group-g','group-h','group-i','group-j','group-k','group-l']
const GROUP_LABELS = ['Grupo A','Grupo B','Grupo C','Grupo D','Grupo E','Grupo F','Grupo G','Grupo H','Grupo I','Grupo J','Grupo K','Grupo L']

function submissionsToCsv(rows) {
  const baseHeaders = ['company', 'alias', 'playerId', 'status', 'score', 'ip', 'referrer', 'userAgent', 'createdAt']
  const headers = [...baseHeaders, ...GROUP_LABELS]
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.join(','),
    ...rows.map(r => {
      const predMap = Object.fromEntries((r.predictions ?? []).map(p => [p.groupId, p.orderedTeams]))
      const predCols = GROUP_KEYS.map(gk => (predMap[gk] ?? []).join(' > '))
      return [
        toCompany(r.playerId),
        r.alias,
        r.playerId,
        r.status,
        r.score ?? '',
        r.ip ?? '',
        r.referrer ?? '',
        r.userAgent ?? '',
        r.createdAt ? new Date(r.createdAt).toLocaleString('es-AR') : '',
        ...predCols
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
  a.click()
  URL.revokeObjectURL(url)
}

export function useQuinielaSubmissions() {
  const { $axios } = useNuxtApp()

  const submissions = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const drawerOpen = ref(false)
  const selectedSubmission = ref(null)
  const filterStatus = ref('')
  const filterSearch = ref('')
  const confirmDeleteOpen = ref(false)

  async function fetchSubmissions(page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      const params = { page, limit }
      if (filterStatus.value) params.status = filterStatus.value
      if (filterSearch.value) params.alias = filterSearch.value
      const { data } = await $axios.get('/backoffice/quiniela/submissions', { params })
      submissions.value = data.submissions
      total.value = data.total
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar participantes'
    } finally {
      loading.value = false
    }
  }

  async function openDrawer(submission) {
    drawerOpen.value = true
    loading.value = true
    try {
      const { data } = await $axios.get(`/backoffice/quiniela/submissions/${submission.id}`)
      selectedSubmission.value = data
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
      const { data } = await $axios.put(`/backoffice/quiniela/submissions/${id}`, { status })
      if (selectedSubmission.value?.id === id) selectedSubmission.value = data
      await fetchSubmissions(page, limit)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al actualizar estado'
    } finally {
      loading.value = false
    }
  }

  function openConfirmDelete(submission) {
    selectedSubmission.value = submission
    confirmDeleteOpen.value = true
  }

  function exportSingleCsv(submission) {
    downloadCsv(submissionsToCsv([submission]), `quiniela-${submission.alias}-${submission.id}.csv`)
  }

  const EXPORT_LIMIT = 5000

  async function exportAllCsv() {
    loading.value = true
    error.value = ''
    try {
      const capped = (total.value || 0) > EXPORT_LIMIT
      const params = { page: 1, limit: capped ? EXPORT_LIMIT : (total.value || EXPORT_LIMIT) }
      if (filterStatus.value) params.status = filterStatus.value
      if (filterSearch.value) params.alias = filterSearch.value
      const { data } = await $axios.get('/backoffice/quiniela/submissions', { params })
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(submissionsToCsv(data.submissions), `quiniela-participantes-${date}.csv`)
      if (capped) {
        error.value = `Se exportaron los primeros ${EXPORT_LIMIT.toLocaleString('es-AR')} registros de ${total.value.toLocaleString('es-AR')} totales.`
      }
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al exportar'
    } finally {
      loading.value = false
    }
  }

  async function confirmDelete(page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      await $axios.delete(`/backoffice/quiniela/submissions/${selectedSubmission.value.id}`)
      confirmDeleteOpen.value = false
      drawerOpen.value = false
      await fetchSubmissions(page, limit)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al eliminar participante'
    } finally {
      loading.value = false
    }
  }

  return {
    submissions, total, loading, error,
    drawerOpen, selectedSubmission, filterStatus, filterSearch,
    confirmDeleteOpen,
    fetchSubmissions, openDrawer, updateStatus, openConfirmDelete, confirmDelete,
    exportSingleCsv, exportAllCsv, toCompany
  }
}
