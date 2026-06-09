export function useQuinielaGroups() {
  const { $axios } = useNuxtApp()

  const groups = ref([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref('')
  const dialogOpen = ref(false)
  const confirmDeleteOpen = ref(false)
  const selectedGroup = ref(null)
  const isEditing = ref(false)

  async function fetchGroups(page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      const { data } = await $axios.get('/backoffice/quiniela/groups', { params: { page, limit } })
      groups.value = data.groups
      total.value = data.total
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al cargar grupos'
    } finally {
      loading.value = false
    }
  }

  function openCreate() {
    selectedGroup.value = {
      groupId: '',
      name: '',
      teams: [
        { id: '', name: '' },
        { id: '', name: '' },
        { id: '', name: '' },
        { id: '', name: '' }
      ]
    }
    isEditing.value = false
    dialogOpen.value = true
  }

  function openEdit(group) {
    selectedGroup.value = {
      _id: group.id,
      groupId: group.groupId,
      name: group.name,
      teams: group.teams.map(t => ({ id: t.id, name: t.name }))
    }
    isEditing.value = true
    dialogOpen.value = true
  }

  async function saveGroup(page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      const payload = {
        groupId: selectedGroup.value.groupId,
        name: selectedGroup.value.name,
        teams: selectedGroup.value.teams
      }
      if (isEditing.value) {
        await $axios.put(`/backoffice/quiniela/groups/${selectedGroup.value._id}`, payload)
      } else {
        await $axios.post('/backoffice/quiniela/groups', payload)
      }
      dialogOpen.value = false
      await fetchGroups(page, limit)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al guardar grupo'
    } finally {
      loading.value = false
    }
  }

  function openConfirmDelete(group) {
    selectedGroup.value = group
    confirmDeleteOpen.value = true
  }

  async function confirmDelete(page = 1, limit = 20) {
    loading.value = true
    error.value = ''
    try {
      await $axios.delete(`/backoffice/quiniela/groups/${selectedGroup.value.id}`)
      confirmDeleteOpen.value = false
      await fetchGroups(page, limit)
    } catch (e) {
      error.value = e.response?.data?.error ?? 'Error al eliminar grupo'
    } finally {
      loading.value = false
    }
  }

  return {
    groups, total, loading, error,
    dialogOpen, confirmDeleteOpen, selectedGroup, isEditing,
    fetchGroups, openCreate, openEdit, saveGroup, openConfirmDelete, confirmDelete
  }
}
