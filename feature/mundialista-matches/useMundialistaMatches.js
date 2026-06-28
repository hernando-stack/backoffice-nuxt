import * as XLSX from 'xlsx'

export function useMundialistaMatches() {
  const { $axios } = useNuxtApp()

  const PHASE_LIST = [
    { id: 'group-stage',   label: 'Fase de Grupos' },
    { id: 'jornada-3',     label: 'Jornada 3' },
    { id: 'dieciseisavos', label: 'Dieciseisavos' },
    { id: 'octavos',       label: 'Octavos de Final' },
    { id: 'cuartos',       label: 'Cuartos de Final' },
    { id: 'campeon',       label: 'Campeón' }
  ]

  const selectedPhaseId = ref('dieciseisavos')
  const matches = ref([])
  const loading = ref(false)
  const error = ref('')

  const importPreview = ref([])
  const importErrors = ref([])
  const importDialog = ref(false)
  const importLoading = ref(false)

  const editDialog = ref(false)
  const editingMatch = ref(null)
  const editForm = ref({})

  const deleteDialog = ref(false)
  const deletingMatch = ref(null)

  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-AR', {
      hour12: false, timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

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

  function parseExcelDate(val) {
    if (!val && val !== 0) return null
    if (typeof val === 'number') {
      const d = XLSX.SSF.parse_date_code(val)
      const iso = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}T${String(d.H).padStart(2, '0')}:${String(d.M).padStart(2, '0')}:00-03:00`
      return new Date(iso).toISOString()
    }
    const str = String(val).trim()
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/)
    if (!match) return null
    const [, d, m, y, H, M] = match
    return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${H.padStart(2, '0')}:${M}:00-03:00`).toISOString()
  }

  async function fetchMatches() {
    if (!selectedPhaseId.value) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.get(`/backoffice/mundialista/phases/${selectedPhaseId.value}/matches`)
      matches.value = data.data ?? []
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar partidos'
    } finally {
      loading.value = false
    }
  }

  function onFileChange(file) {
    if (!file) return
    importErrors.value = []
    importPreview.value = []
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
      const parsed = []
      const errs = []
      rows.forEach((row, i) => {
        const fecha   = row['fecha']    ?? row['Fecha']   ?? row['FECHA']   ?? row['Fecha hora Argentina']
        const equipoA = row['equipo_a'] ?? row['Equipo A'] ?? row['EQUIPO_A'] ?? row['1'] ?? row[1]
        const equipoB = row['equipo_b'] ?? row['Equipo B'] ?? row['EQUIPO_B'] ?? row['2'] ?? row[2]
        const empate  = row['empate']   ?? row['Empate']  ?? row['EMPATE']  ?? row['X']  ?? 'No'
        const date = parseExcelDate(fecha)
        if (!date)    errs.push(`Fila ${i + 2}: fecha inválida "${fecha}" — usá formato DD/MM/YYYY HH:mm`)
        if (!equipoA) errs.push(`Fila ${i + 2}: falta equipo_a`)
        if (!equipoB) errs.push(`Fila ${i + 2}: falta equipo_b`)
        if (date && equipoA && equipoB) {
          const rawEmpate = String(empate).trim().toLowerCase()
          parsed.push({
            date,
            teamA:     String(equipoA).trim(),
            teamB:     String(equipoB).trim(),
            allowDraw: rawEmpate.startsWith('s') || rawEmpate === 'empate'
          })
        }
      })
      importErrors.value = errs
      importPreview.value = parsed
      if (!errs.length && parsed.length) importDialog.value = true
    }
    reader.readAsArrayBuffer(file)
  }

  async function confirmImport() {
    importLoading.value = true
    error.value = ''
    try {
      await $axios.post(`/backoffice/mundialista/phases/${selectedPhaseId.value}/matches/bulk`, {
        matches: importPreview.value
      })
      importDialog.value = false
      importPreview.value = []
      await fetchMatches()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al importar partidos'
    } finally {
      importLoading.value = false
    }
  }

  function openEdit(match) {
    editingMatch.value = match
    editForm.value = {
      date:      toArgTz(match.date),
      teamA:     match.teamA.name,
      teamB:     match.teamB.name,
      allowDraw: match.allowDraw
    }
    editDialog.value = true
  }

  async function saveEdit() {
    loading.value = true
    error.value = ''
    try {
      await $axios.put(`/backoffice/mundialista/matches/${editingMatch.value.id}`, {
        date:      new Date(editForm.value.date + ':00-03:00').toISOString(),
        teamA:     editForm.value.teamA,
        teamB:     editForm.value.teamB,
        allowDraw: editForm.value.allowDraw
      })
      editDialog.value = false
      await fetchMatches()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar'
    } finally {
      loading.value = false
    }
  }

  function openDelete(match) {
    deletingMatch.value = match
    deleteDialog.value = true
  }

  async function confirmDelete() {
    loading.value = true
    error.value = ''
    try {
      await $axios.delete(`/backoffice/mundialista/matches/${deletingMatch.value.id}`)
      deleteDialog.value = false
      await fetchMatches()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al eliminar'
    } finally {
      loading.value = false
    }
  }

  return {
    PHASE_LIST, selectedPhaseId, matches, loading, error,
    importPreview, importErrors, importDialog, importLoading,
    editDialog, editingMatch, editForm,
    deleteDialog, deletingMatch,
    fetchMatches, onFileChange, confirmImport,
    openEdit, saveEdit, openDelete, confirmDelete, fmtDate
  }
}
