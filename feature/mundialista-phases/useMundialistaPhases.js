export function useMundialistaPhases() {
  const { $axios } = useNuxtApp()

  const phases = ref([])
  const loading = ref(false)
  const error = ref('')
  const editDialog = ref(false)
  const confirmForceOpen = ref(false)
  const confirmForceClose = ref(false)
  const selectedPhase = ref(null)
  const editForm = ref({})

  function toArgTz(iso) {
    if (!iso) return ''
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires'
    }).formatToParts(new Date(iso))
    const get = type => parts.find(p => p.type === type).value
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
  }

  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-AR', {
      hour12: false, timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function phaseStatus(p) {
    if (p.forceStatus === 'open')   return { label: '🟢 Abierta (forzada)', color: 'success' }
    if (p.forceStatus === 'closed') return { label: '🔴 Cerrada (forzada)', color: 'error' }
    if (p.isOpen)                   return { label: '🟢 Abierta (auto)',    color: 'success' }
    const now = new Date()
    if (now < new Date(p.startDate)) return { label: '🔒 Próximamente', color: 'default' }
    return { label: '🔴 Cerrada (auto)', color: 'error' }
  }

  async function fetchPhases() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.get('/backoffice/mundialista/phases')
      phases.value = data.data ?? []
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar fases'
    } finally {
      loading.value = false
    }
  }

  function openEdit(phase) {
    selectedPhase.value = phase
    editForm.value = {
      startDate: toArgTz(phase.startDate),
      endDate:   toArgTz(phase.endDate)
    }
    editDialog.value = true
  }

  async function saveEdit() {
    loading.value = true
    error.value = ''
    try {
      await $axios.put(`/backoffice/mundialista/phases/${selectedPhase.value.id}`, {
        startDate: new Date(editForm.value.startDate + ':00-03:00').toISOString(),
        endDate:   new Date(editForm.value.endDate   + ':00-03:00').toISOString()
      })
      editDialog.value = false
      await fetchPhases()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar'
    } finally {
      loading.value = false
    }
  }

  async function forceOpen(phase) {
    loading.value = true
    error.value = ''
    confirmForceOpen.value = false
    try {
      await $axios.post(`/backoffice/mundialista/phases/${phase.id}/open`)
      await fetchPhases()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error'
    } finally {
      loading.value = false
    }
  }

  async function forceClose(phase) {
    loading.value = true
    error.value = ''
    confirmForceClose.value = false
    try {
      await $axios.post(`/backoffice/mundialista/phases/${phase.id}/close`)
      await fetchPhases()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error'
    } finally {
      loading.value = false
    }
  }

  async function setAuto(phase) {
    loading.value = true
    error.value = ''
    try {
      await $axios.post(`/backoffice/mundialista/phases/${phase.id}/auto`)
      await fetchPhases()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error'
    } finally {
      loading.value = false
    }
  }

  return {
    phases, loading, error,
    editDialog, confirmForceOpen, confirmForceClose, selectedPhase, editForm,
    fetchPhases, openEdit, saveEdit, forceOpen, forceClose, setAuto, fmtDate, phaseStatus
  }
}
