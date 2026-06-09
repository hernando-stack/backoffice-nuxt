export function useQuinielaConfig() {
  const { $axios } = useNuxtApp()

  const configs = ref([])
  const loading = ref(false)
  const error = ref('')
  const dialogOpen = ref(false)
  const confirmDeleteOpen = ref(false)
  const selectedConfig = ref(null)
  const isEditing = ref(false)

  async function fetchConfigs() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.get('/backoffice/quiniela/config')
      configs.value = data.configs ?? data
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar configuración'
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    selectedConfig.value = {
      cutoffAt: '',
      status: 'open',
      currency: 'ARS',
      prize: 5000000,
      minDeposit: 5000
    }
    isEditing.value = false
    dialogOpen.value = true
  }

  function openEdit(config) {
    selectedConfig.value = {
      _id: config.id,
      cutoffAt: config.cutoffAt ? config.cutoffAt.substring(0, 16) : '',
      status: config.status,
      currency: config.currency,
      prize: config.prize,
      minDeposit: config.minDeposit
    }
    isEditing.value = true
    dialogOpen.value = true
  }

  async function saveConfig() {
    loading.value = true
    error.value = ''
    try {
      const payload = {
        cutoffAt: new Date(selectedConfig.value.cutoffAt).toISOString(),
        status: selectedConfig.value.status,
        currency: selectedConfig.value.currency,
        prize: Number(selectedConfig.value.prize),
        minDeposit: Number(selectedConfig.value.minDeposit)
      }
      if (isEditing.value) {
        await $axios.put(`/backoffice/quiniela/config/${selectedConfig.value._id}`, payload)
      } else {
        await $axios.post('/backoffice/quiniela/config', payload)
      }
      dialogOpen.value = false
      await fetchConfigs()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar configuración'
    } finally {
      loading.value = false
    }
  }

  function openConfirmDelete(config) {
    selectedConfig.value = config
    confirmDeleteOpen.value = true
  }

  async function confirmDelete() {
    loading.value = true
    error.value = ''
    try {
      await $axios.delete(`/backoffice/quiniela/config/${selectedConfig.value.id}`)
      confirmDeleteOpen.value = false
      await fetchConfigs()
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al eliminar configuración'
    } finally {
      loading.value = false
    }
  }

  return {
    configs, loading, error,
    dialogOpen, confirmDeleteOpen, selectedConfig, isEditing,
    fetchConfigs, openCreate, openEdit, saveConfig, openConfirmDelete, confirmDelete
  }
}
