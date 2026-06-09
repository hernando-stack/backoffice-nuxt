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
    fetchSubmissions, openDrawer, updateStatus, openConfirmDelete, confirmDelete
  }
}
