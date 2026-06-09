<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Participantes</h1>
      <v-spacer />
      <v-text-field
        v-model="filterSearch"
        placeholder="Buscar alias o playerId..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        style="max-width:260px"
        class="mr-3"
        @update:model-value="fetchSubmissions(1, itemsPerPage)"
      />
      <v-select
        v-model="filterStatus"
        :items="statusOptions"
        placeholder="Todos los estados"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        style="max-width:200px"
        class="mr-3"
        @update:model-value="fetchSubmissions(1, itemsPerPage)"
      />
    </div>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="submissions"
        :items-length="total"
        :loading="loading"
        item-value="id"
        @update:options="onTableUpdate"
      >
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" size="small">{{ item.status }}</v-chip>
        </template>
        <template #item.createdAt="{ item }">
          {{ new Date(item.createdAt).toLocaleString('es-AR') }}
        </template>
        <template #item.actions="{ item }">
          <v-btn size="small" variant="tonal" color="primary" @click="openDrawer(item)">Ver</v-btn>
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" class="ml-1" @click="openConfirmDelete(item)" />
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Lateral drawer: submission detail -->
    <v-navigation-drawer v-model="drawerOpen" location="right" width="420" temporary>
      <div class="pa-4" v-if="selectedSubmission">
        <div class="text-h6 mb-4">{{ selectedSubmission.alias }}</div>

        <v-card class="mb-4" variant="outlined">
          <v-card-title class="text-subtitle-2">Datos de seguridad</v-card-title>
          <v-list density="compact">
            <v-list-item title="Player ID" :subtitle="selectedSubmission.playerId" />
            <v-list-item title="IP" :subtitle="selectedSubmission.ip ?? '—'" />
            <v-list-item title="User Agent" :subtitle="selectedSubmission.userAgent ?? '—'" />
            <v-list-item title="Referrer" :subtitle="selectedSubmission.referrer ?? '—'" />
            <v-list-item title="Fecha" :subtitle="selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt).toLocaleString('es-AR') : '—'" />
          </v-list>
        </v-card>

        <v-card class="mb-4" variant="outlined">
          <v-card-title class="text-subtitle-2">Estado</v-card-title>
          <v-card-text>
            <v-select
              v-model="selectedSubmission.status"
              :items="statusOptions"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-btn color="primary" variant="flat" size="small" :loading="loading"
                   @click="updateStatus(selectedSubmission.id, selectedSubmission.status, page, itemsPerPage)">
              Guardar estado
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card variant="outlined">
          <v-card-title class="text-subtitle-2">Pronósticos</v-card-title>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Grupo</th><th>1°</th><th>2°</th><th>3°</th><th>4°</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pred in selectedSubmission.predictions" :key="pred.groupId">
                <td>{{ pred.groupId }}</td>
                <td v-for="(teamId, i) in pred.orderedTeams" :key="i">{{ teamId }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </div>
      <div v-else class="pa-4 text-center text-medium-emphasis">Cargando...</div>
    </v-navigation-drawer>

    <!-- Confirm delete -->
    <v-dialog v-model="confirmDeleteOpen" max-width="380">
      <v-card>
        <v-card-title>Eliminar participante</v-card-title>
        <v-card-text>¿Eliminás a <strong>{{ selectedSubmission?.alias }}</strong>? Esta acción no se puede deshacer.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDeleteOpen = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" :loading="loading" @click="confirmDelete(page, itemsPerPage)">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useQuinielaSubmissions } from '~/feature/quiniela-submissions'

definePageMeta({ middleware: 'auth' })

const {
  submissions, total, loading, error,
  drawerOpen, selectedSubmission, filterStatus, filterSearch,
  confirmDeleteOpen,
  fetchSubmissions, openDrawer, updateStatus, openConfirmDelete, confirmDelete
} = useQuinielaSubmissions()

const page = ref(1)
const itemsPerPage = ref(20)

const headers = [
  { title: 'Alias', key: 'alias', sortable: false },
  { title: 'Player ID', key: 'playerId', sortable: false },
  { title: 'Estado', key: 'status', sortable: false },
  { title: 'Score', key: 'score', sortable: false },
  { title: 'IP', key: 'ip', sortable: false },
  { title: 'Fecha', key: 'createdAt', sortable: false },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

const statusOptions = ['pending-validation', 'valid', 'invalid', 'disqualified']

function statusColor(s) {
  return { 'pending-validation': 'warning', valid: 'success', invalid: 'error', disqualified: 'default' }[s] ?? 'default'
}

function onTableUpdate({ page: p, itemsPerPage: ipp }) {
  page.value = p
  itemsPerPage.value = ipp
  fetchSubmissions(p, ipp)
}

onMounted(() => fetchSubmissions())
</script>
