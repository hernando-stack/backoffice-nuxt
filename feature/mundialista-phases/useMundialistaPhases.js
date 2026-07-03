export function useMundialistaPhases() {
  const { $axios } = useNuxtApp()
  const config = useRuntimeConfig()

  const phases = ref([])
  const loading = ref(false)
  const error = ref('')
  const editDialog = ref(false)
  const confirmForceOpen = ref(false)
  const confirmForceClose = ref(false)
  const selectedPhase = ref(null)
  const editForm = ref({})

  const bonusDialog = ref(false)
  const bonusForm = ref([])

  const teamsDialog = ref(false)
  const teamsForm = ref([])
  const allTeams = ref([])

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
      endDate:   toArgTz(phase.endDate),
      prizePool: phase.prizePool ?? 0
    }
    editDialog.value = true
  }

  async function saveEdit() {
    loading.value = true
    error.value = ''
    try {
      await $axios.put(`/backoffice/mundialista/phases/${selectedPhase.value.id}`, {
        startDate: new Date(editForm.value.startDate + ':00-03:00').toISOString(),
        endDate:   new Date(editForm.value.endDate   + ':00-03:00').toISOString(),
        prizePool: Number(editForm.value.prizePool)
      })
      editDialog.value = false
      await fetchPhases()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar'
    } finally {
      loading.value = false
    }
  }

  // ── Preguntas bonus / desempate ──
  const BONUS_TYPES = [
    { value: 'number',       title: 'Número' },
    { value: 'boolean',      title: 'Sí / No' },
    { value: 'choice',       title: 'Opción múltiple' },
    { value: 'team-select',  title: 'Selección de equipo' }
  ]

  function toRowForm(q) {
    return {
      id: q.id ?? '',
      type: q.type ?? 'number',
      icon: q.icon ?? '⚽',
      label: q.label ?? '',
      required: q.required ?? true,
      min: q.min ?? 0,
      max: q.max ?? 100,
      optionsCsv: (q.options ?? []).map(o => `${o.value}:${o.label}`).join(', '),
      excludeCsv: (q.excludeQuestionIds ?? []).join(', ')
    }
  }

  function openBonusEdit(phase) {
    selectedPhase.value = phase
    bonusForm.value = (phase.bonusQuestions ?? []).map(toRowForm)
    bonusDialog.value = true
  }

  function addBonusQuestion() {
    bonusForm.value.push(toRowForm({}))
  }

  function removeBonusQuestion(index) {
    bonusForm.value.splice(index, 1)
  }

  function parseOptionsCsv(csv) {
    const parts = (csv ?? '').split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length === 0) return undefined
    return parts.map(p => {
      const [rawValue, rawLabel] = p.includes(':') ? p.split(':') : [p, p]
      const num = Number(rawValue)
      return { value: Number.isNaN(num) ? rawValue.trim() : num, label: (rawLabel ?? rawValue).trim() }
    })
  }

  function parseCsvList(csv) {
    const parts = (csv ?? '').split(',').map(s => s.trim()).filter(Boolean)
    return parts.length > 0 ? parts : undefined
  }

  async function saveBonusEdit() {
    loading.value = true
    error.value = ''
    try {
      const bonusQuestions = bonusForm.value.map(r => ({
        id: r.id.trim(),
        type: r.type,
        icon: r.icon,
        label: r.label.trim(),
        required: !!r.required,
        min: r.type === 'number' ? Number(r.min) : undefined,
        max: r.type === 'number' ? Number(r.max) : undefined,
        options: r.type === 'choice' ? parseOptionsCsv(r.optionsCsv) : undefined,
        excludeQuestionIds: r.type === 'team-select' ? parseCsvList(r.excludeCsv) : undefined
      }))
      await $axios.put(`/backoffice/mundialista/phases/${selectedPhase.value.id}`, { bonusQuestions })
      bonusDialog.value = false
      await fetchPhases()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar preguntas bonus'
    } finally {
      loading.value = false
    }
  }

  // ── Equipos clasificados (restringe el selector de campeón) ──
  async function ensureAllTeams() {
    if (allTeams.value.length > 0) return
    try {
      const data = await $fetch(`${config.public.apiUrl}/public/mundialista/teams/qualified`)
      allTeams.value = data?.data ?? []
    } catch {
      allTeams.value = []
    }
  }

  async function openTeamsEdit(phase) {
    selectedPhase.value = phase
    await ensureAllTeams()
    teamsForm.value = [...(phase.qualifiedTeamIds ?? [])]
    teamsDialog.value = true
  }

  async function saveTeamsEdit() {
    loading.value = true
    error.value = ''
    try {
      await $axios.put(`/backoffice/mundialista/phases/${selectedPhase.value.id}`, {
        qualifiedTeamIds: teamsForm.value
      })
      teamsDialog.value = false
      await fetchPhases()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar equipos'
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
    fetchPhases, openEdit, saveEdit, forceOpen, forceClose, setAuto, fmtDate, phaseStatus,

    bonusDialog, bonusForm, BONUS_TYPES,
    openBonusEdit, addBonusQuestion, removeBonusQuestion, saveBonusEdit,

    teamsDialog, teamsForm, allTeams,
    openTeamsEdit, saveTeamsEdit
  }
}
