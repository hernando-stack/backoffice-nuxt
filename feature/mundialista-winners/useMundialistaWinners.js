import * as XLSX from 'xlsx'

export function useMundialistaWinners() {
  const { $axios } = useNuxtApp()

  const PHASE_LIST = [
    { id: 'group-stage',   label: 'Fase de Grupos' },
    { id: 'jornada-3',     label: 'Jornada 3' },
    { id: 'dieciseisavos', label: 'Dieciseisavos' },
    { id: 'octavos',       label: 'Octavos de Final' },
    { id: 'cuartos',       label: 'Cuartos de Final' },
    { id: 'campeon',       label: 'Campeón' }
  ]

  const selectedPhaseId = ref('group-stage')
  const winners = ref([])
  const loading = ref(false)
  const error = ref('')

  const importPreview = ref([])
  const importErrors = ref([])
  const importDialog = ref(false)
  const importLoading = ref(false)
  const importPhaseId = ref(null) // fase objetivo fijada al elegir el archivo, no al confirmar

  const downloadDialog = ref(false)
  const downloadAllLoading = ref(false)

  const editDialog = ref(false)
  const editingWinner = ref(null)
  const editForm = ref({})

  const addDialog = ref(false)
  const addForm = ref({ position: null, alias: '', casino: '', points: null, prize: '' })
  const addLoading = ref(false)

  const deleteDialog = ref(false)
  const deletingWinner = ref(null)

  async function fetchWinners() {
    if (!selectedPhaseId.value) return
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.get(`/backoffice/mundialista/phases/${selectedPhaseId.value}/winners`)
      winners.value = data.data ?? []
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar ganadores'
    } finally {
      loading.value = false
    }
  }

  function onFileChange(file) {
    if (!file) return
    importErrors.value = []
    importPreview.value = []
    importPhaseId.value = selectedPhaseId.value // fijar la fase ahora, no leerla recien al confirmar
    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true })
      const parsed = []
      const errs = []
      rows.forEach((row, i) => {
        const posicion = row['posicion'] ?? row['Posición'] ?? row['POSICION'] ?? row['Posicion']
        const alias    = row['alias']    ?? row['Alias']    ?? row['ALIAS']
        const casino   = row['casino']   ?? row['Casino']   ?? row['CASINO']
        const puntos   = row['puntos']   ?? row['Puntos']   ?? row['PUNTOS']
        const premio   = row['premio']   ?? row['Premio']   ?? row['PREMIO']

        const position = Number(posicion)
        const points = Number(puntos)

        if (!posicion || Number.isNaN(position)) errs.push(`Fila ${i + 2}: posición inválida "${posicion}"`)
        if (!alias)    errs.push(`Fila ${i + 2}: falta alias`)
        if (!casino)   errs.push(`Fila ${i + 2}: falta casino`)
        if (!puntos || Number.isNaN(points)) errs.push(`Fila ${i + 2}: puntos inválidos "${puntos}"`)
        if (!premio)   errs.push(`Fila ${i + 2}: falta premio`)

        if (posicion && alias && casino && puntos && premio && !Number.isNaN(position) && !Number.isNaN(points)) {
          parsed.push({
            position,
            alias:  String(alias).trim(),
            casino: String(casino).trim(),
            points,
            prize:  String(premio).trim()
          })
        }
      })
      importErrors.value = errs
      importPreview.value = parsed.sort((a, b) => a.position - b.position)
      if (!errs.length && parsed.length) importDialog.value = true
    }
    reader.readAsArrayBuffer(file)
  }

  async function confirmImport() {
    importLoading.value = true
    error.value = ''
    try {
      // Usa la fase fijada en onFileChange, no selectedPhaseId.value: si el operador
      // cambia el selector de fase mientras el dialogo de preview esta abierto, el
      // import sigue yendo a la fase que tenia seleccionada al elegir el archivo.
      await $axios.post(`/backoffice/mundialista/phases/${importPhaseId.value}/winners/bulk`, {
        winners: importPreview.value
      })
      importDialog.value = false
      importPreview.value = []
      if (importPhaseId.value === selectedPhaseId.value) await fetchWinners()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al importar ganadores'
    } finally {
      importLoading.value = false
    }
  }

  function winnersToRows(list) {
    return list.map(w => ({
      Posición: w.position,
      Alias:    w.alias,
      Casino:   w.casino,
      Puntos:   w.points,
      Premio:   w.prize
    }))
  }

  function openDownload() {
    downloadDialog.value = true
  }

  function downloadCurrentPhase() {
    const ws = XLSX.utils.json_to_sheet(winnersToRows(winners.value))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ganadores')
    XLSX.writeFile(wb, `ganadores_${selectedPhaseId.value}.xlsx`)
    downloadDialog.value = false
  }

  async function downloadAllPhases() {
    downloadAllLoading.value = true
    error.value = ''
    try {
      const wb = XLSX.utils.book_new()
      for (const phase of PHASE_LIST) {
        const { data } = await $axios.get(`/backoffice/mundialista/phases/${phase.id}/winners`)
        const ws = XLSX.utils.json_to_sheet(winnersToRows(data.data ?? []))
        // Nombre de hoja Excel: max 31 caracteres, sin : \ / ? * [ ]
        const sheetName = phase.label.replace(/[:\\/?*[\]]/g, '').slice(0, 31)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }
      XLSX.writeFile(wb, 'ganadores_todas_las_fases.xlsx')
      downloadDialog.value = false
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al descargar todas las fases'
    } finally {
      downloadAllLoading.value = false
    }
  }

  function openAdd() {
    addForm.value = { position: (winners.value.length ? Math.max(...winners.value.map(w => w.position)) + 1 : 1), alias: '', casino: '', points: null, prize: '' }
    addDialog.value = true
  }

  async function confirmAdd() {
    addLoading.value = true
    error.value = ''
    try {
      await $axios.post(`/backoffice/mundialista/phases/${selectedPhaseId.value}/winners`, addForm.value)
      addDialog.value = false
      await fetchWinners()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al agregar ganador'
    } finally {
      addLoading.value = false
    }
  }

  function openEdit(winner) {
    editingWinner.value = winner
    editForm.value = {
      position: winner.position,
      alias:    winner.alias,
      casino:   winner.casino,
      points:   winner.points,
      prize:    winner.prize
    }
    editDialog.value = true
  }

  async function saveEdit() {
    loading.value = true
    error.value = ''
    try {
      await $axios.put(`/backoffice/mundialista/winners/${editingWinner.value.id}`, editForm.value)
      editDialog.value = false
      await fetchWinners()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar'
    } finally {
      loading.value = false
    }
  }

  function openDelete(winner) {
    deletingWinner.value = winner
    deleteDialog.value = true
  }

  async function confirmDelete() {
    loading.value = true
    error.value = ''
    try {
      await $axios.delete(`/backoffice/mundialista/winners/${deletingWinner.value.id}`)
      deleteDialog.value = false
      await fetchWinners()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al eliminar'
    } finally {
      loading.value = false
    }
  }

  return {
    PHASE_LIST, selectedPhaseId, winners, loading, error,
    importPreview, importErrors, importDialog, importLoading, importPhaseId,
    downloadDialog, downloadAllLoading,
    addDialog, addForm, addLoading,
    editDialog, editingWinner, editForm,
    deleteDialog, deletingWinner,
    fetchWinners, onFileChange, confirmImport,
    openDownload, downloadCurrentPhase, downloadAllPhases,
    openAdd, confirmAdd, openEdit, saveEdit, openDelete, confirmDelete
  }
}
