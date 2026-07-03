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
  // El jugador (Will) nunca ve ni escribe IDs internos, CSV, ni sintaxis
  // valor:etiqueta -- todo eso se genera/parsea acá, a partir de texto plano.
  const BONUS_TYPES = [
    { value: 'number',       title: 'Número (el jugador escribe una cantidad)' },
    { value: 'boolean',      title: 'Sí / No' },
    { value: 'choice',       title: 'Opción múltiple (el jugador elige una)' },
    { value: 'team-select',  title: 'Selección de equipo' }
  ]

  const ICON_PRESETS = ['⚽', '🥅', '🎯', '🏆', '🥈', '🥉', '🔢', '❓', '⏱️', '🟨', '🟥', '🎲']

  const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g')

  function slugify(text) {
    const base = (text ?? '')
      .normalize('NFD').replace(DIACRITICS_RE, '')
      .toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
    return base || 'pregunta'
  }

  function uniqueId(base, usedIds) {
    let id = base
    let n = 2
    while (usedIds.has(id)) { id = `${base}_${n}`; n++ }
    usedIds.add(id)
    return id
  }

  function openBonusEdit(phase) {
    selectedPhase.value = phase
    const questions = phase.bonusQuestions ?? []
    const idToIndex = new Map(questions.map((q, i) => [q.id, i]))
    bonusForm.value = questions.map(q => ({
      _id: q.id, // preservado para no romper respuestas ya guardadas con este ID; nunca se muestra
      label: q.label ?? '',
      type: q.type ?? 'number',
      icon: q.icon ?? '⚽',
      required: q.required ?? true,
      min: q.min ?? 0,
      max: q.max ?? 100,
      choiceOptions: (q.options ?? []).map(o => String(o.label)),
      excludeChampion: (q.excludeQuestionIds ?? []).includes('champion'),
      excludeOtherIndexes: (q.excludeQuestionIds ?? [])
        .filter(id => id !== 'champion' && idToIndex.has(id))
        .map(id => idToIndex.get(id))
    }))
    bonusDialog.value = true
  }

  function addBonusQuestion() {
    bonusForm.value.push({
      _id: null,
      label: '',
      type: 'number',
      icon: '⚽',
      required: true,
      min: 0,
      max: 100,
      choiceOptions: ['', '', ''],
      excludeChampion: false,
      excludeOtherIndexes: []
    })
  }

  function removeBonusQuestion(index) {
    // reacomoda las referencias de "no repetir equipo de la pregunta X" de las filas restantes
    bonusForm.value.forEach(r => {
      r.excludeOtherIndexes = r.excludeOtherIndexes
        .filter(i => i !== index)
        .map(i => (i > index ? i - 1 : i))
    })
    bonusForm.value.splice(index, 1)
  }

  function addChoiceOption(row) {
    row.choiceOptions.push('')
  }

  function removeChoiceOption(row, i) {
    row.choiceOptions.splice(i, 1)
  }

  // Otras preguntas de tipo "Selección de equipo" en el formulario actual,
  // para armar los checkboxes de "no repetir equipo elegido en".
  function otherTeamSelectRows(index) {
    return bonusForm.value
      .map((r, i) => ({ ...r, _index: i }))
      .filter((r, i) => i !== index && r.type === 'team-select')
  }

  async function saveBonusEdit() {
    error.value = ''
    const emptyIndex = bonusForm.value.findIndex(r => !r.label.trim())
    if (emptyIndex !== -1) {
      error.value = `La pregunta #${emptyIndex + 1} no tiene texto. Completala o borrala con el ícono de basura.`
      return
    }

    loading.value = true
    try {
      const usedIds = new Set(bonusForm.value.map(r => r._id).filter(Boolean))
      const finalIds = bonusForm.value.map(r => r._id ?? uniqueId(slugify(r.label), usedIds))

      const bonusQuestions = bonusForm.value.map((r, i) => ({
        id: finalIds[i],
        type: r.type,
        icon: r.icon,
        label: r.label.trim(),
        required: !!r.required,
        min: r.type === 'number' ? Number(r.min) : undefined,
        max: r.type === 'number' ? Number(r.max) : undefined,
        options: r.type === 'choice'
          ? r.choiceOptions
              .map(o => o.trim())
              .filter(Boolean)
              .map(o => {
                const num = Number(o)
                return { value: Number.isNaN(num) ? o : num, label: o }
              })
          : undefined,
        excludeQuestionIds: r.type === 'team-select'
          ? [
              ...(r.excludeChampion ? ['champion'] : []),
              ...r.excludeOtherIndexes.map(idx => finalIds[idx]).filter(Boolean)
            ]
          : undefined
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

    bonusDialog, bonusForm, BONUS_TYPES, ICON_PRESETS,
    openBonusEdit, addBonusQuestion, removeBonusQuestion, saveBonusEdit,
    addChoiceOption, removeChoiceOption, otherTeamSelectRows,

    teamsDialog, teamsForm, allTeams,
    openTeamsEdit, saveTeamsEdit
  }
}
