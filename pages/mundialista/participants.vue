<template>
  <div>
    <h1 class="text-h5 mb-4">Mundialista — Participantes</h1>

    <!-- Filter bar -->
    <div class="mb-4">
      <div class="d-flex flex-column flex-sm-row gap-2 flex-wrap">
        <v-select
          v-model="filterPhase"
          :items="PHASES"
          item-title="label"
          item-value="id"
          label="Fase"
          variant="outlined"
          density="compact"
          hide-details
          style="min-width: 180px"
          @update:model-value="fetchSubmissions(1, itemsPerPage)"
        />
        <v-text-field
          v-model="filterAlias"
          placeholder="Buscar alias..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
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
          @update:model-value="fetchSubmissions(1, itemsPerPage)"
        />
        <v-btn
          prepend-icon="mdi-download"
          variant="tonal"
          color="primary"
          :loading="loading"
          @click="exportAllCsv"
        >Exportar todo</v-btn>
      </div>
    </div>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <!-- Mobile: card list -->
    <template v-if="$vuetify.display.smAndDown">
      <div v-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <template v-else>
        <v-card
          v-for="item in submissions"
          :key="item.id"
          class="mb-3"
          variant="outlined"
        >
          <v-card-text class="pb-0">
            <div class="d-flex justify-space-between align-start">
              <div>
                <div class="font-weight-bold text-body-1">{{ item.alias }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.userId }} · {{ item.phaseId }}</div>
              </div>
              <v-chip :color="statusColor(item.status)" size="small">{{ item.status }}</v-chip>
            </div>
            <div class="text-caption mt-2 text-medium-emphasis">
              <span class="mr-3">Score: {{ item.score ?? '—' }}</span>
              <span>{{ item.createdAt ? new Date(item.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '—' }}</span>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn size="small" variant="tonal" color="primary" @click="openDrawer(item)">Ver</v-btn>
            <v-spacer />
            <v-btn size="small" icon="mdi-delete" variant="text" color="error" @click="openConfirmDelete(item)" />
          </v-card-actions>
        </v-card>
        <v-pagination
          v-if="total > itemsPerPage"
          v-model="page"
          :length="Math.ceil(total / itemsPerPage)"
          density="compact"
          class="mt-2"
          @update:model-value="p => { page = p; fetchSubmissions(p, itemsPerPage) }"
        />
      </template>
    </template>

    <!-- Desktop: data table -->
    <v-card v-else>
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
          {{ item.createdAt ? new Date(item.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '—' }}
        </template>
        <template #item.actions="{ item }">
          <v-btn size="small" variant="tonal" color="primary" @click="openDrawer(item)">Ver</v-btn>
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" class="ml-1" @click="openConfirmDelete(item)" />
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Lateral drawer: submission detail -->
    <v-navigation-drawer
      v-model="drawerOpen"
      location="right"
      :width="$vuetify.display.smAndDown ? '100%' : 460"
      temporary
    >
      <div class="pa-4" v-if="selected">
        <div class="d-flex align-center mb-4">
          <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" @click="drawerOpen = false" />
          <div class="text-h6 flex-grow-1">{{ selected.alias }}</div>
        </div>

        <v-card class="mb-4" variant="outlined">
          <v-card-title class="text-subtitle-2">Datos</v-card-title>
          <v-list density="compact">
            <v-list-item title="User ID"    :subtitle="selected.userId" />
            <v-list-item title="Company"    :subtitle="selected.company || '—'" />
            <v-list-item title="Fase"       :subtitle="selected.phaseId" />
            <v-list-item title="Tipo"       :subtitle="selected.phaseType" />
            <v-list-item title="IP"         :subtitle="selected.ip || '—'" />
            <v-list-item title="User Agent" :subtitle="selected.userAgent || '—'" />
            <v-list-item title="Referrer"   :subtitle="selected.referrer || '—'" />
            <v-list-item
              title="Fecha"
              :subtitle="selected.createdAt ? new Date(selected.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '—'"
            />
          </v-list>
        </v-card>

        <v-card class="mb-4" variant="outlined">
          <v-card-title class="text-subtitle-2">Estado</v-card-title>
          <v-card-text>
            <v-select
              v-model="selected.status"
              :items="statusOptions"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-text-field
              v-model.number="selected.score"
              label="Score"
              type="number"
              variant="outlined"
              density="compact"
              class="mb-2"
            />
            <v-btn color="primary" variant="flat" size="small" :loading="loading"
                   @click="updateStatus(selected.id, selected.status, page, itemsPerPage)">
              Guardar
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Predictions: polymorphic rendering -->
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-2">Pronósticos</v-card-title>

          <!-- MATCH_RESULTS: array of { matchId, outcome } -->
          <template v-if="Array.isArray(selected.predictions)">
            <v-list density="compact">
              <v-list-item
                v-for="p in selected.predictions"
                :key="p.matchId"
                :title="p.matchId"
                :subtitle="p.outcome"
              />
            </v-list>
          </template>

          <!-- CHAMPION_PICK: { teamId } -->
          <template v-else-if="selected.predictions?.teamId">
            <v-list density="compact">
              <v-list-item title="Campeón elegido" :subtitle="selected.predictions.teamId" />
            </v-list>
          </template>

          <!-- GROUP_STAGE: array of { groupId, orderedTeams } — fallback -->
          <template v-else-if="selected.predictions?.length">
            <v-list density="compact">
              <v-list-item
                v-for="p in selected.predictions"
                :key="p.groupId"
                :title="p.groupId"
              >
                <template #subtitle>
                  <span v-for="(t, i) in p.orderedTeams" :key="i" class="mr-2">{{ i + 1 }}° {{ t }}</span>
                </template>
              </v-list-item>
            </v-list>
          </template>

          <v-card-text v-else class="text-medium-emphasis text-caption">Sin pronósticos registrados.</v-card-text>
        </v-card>
      </div>
      <div v-else class="pa-4 text-center text-medium-emphasis">Cargando...</div>
    </v-navigation-drawer>

    <!-- Confirm delete dialog -->
    <v-dialog v-model="confirmDeleteOpen" max-width="380">
      <v-card>
        <v-card-title>Eliminar participante</v-card-title>
        <v-card-text>¿Eliminás a <strong>{{ selected?.alias }}</strong> de la fase <strong>{{ selected?.phaseId }}</strong>? Esta acción no se puede deshacer.</v-card-text>
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
import { useMundialistaSubmissions } from '~/feature/mundialista-submissions'

definePageMeta({ middleware: 'auth' })

const {
  PHASES,
  submissions, total, loading, error,
  drawerOpen, selected, filterPhase, filterStatus, filterAlias,
  confirmDeleteOpen,
  fetchSubmissions, openDrawer, updateStatus, openConfirmDelete, confirmDelete, exportAllCsv
} = useMundialistaSubmissions()

const page        = ref(1)
const itemsPerPage = ref(20)

const headers = [
  { title: 'Alias',    key: 'alias',     sortable: false },
  { title: 'User ID',  key: 'userId',    sortable: false },
  { title: 'Company',  key: 'company',   sortable: false },
  { title: 'Fase',     key: 'phaseId',   sortable: false },
  { title: 'Tipo',     key: 'phaseType', sortable: false },
  { title: 'Estado',   key: 'status',    sortable: false },
  { title: 'Score',    key: 'score',     sortable: false },
  { title: 'IP',       key: 'ip',        sortable: false },
  { title: 'Fecha',    key: 'createdAt', sortable: false },
  { title: 'Acciones', key: 'actions',   sortable: false, align: 'end' }
]

const statusOptions = ['pending-validation', 'validated', 'invalid']

function statusColor(s) {
  return { 'pending-validation': 'warning', validated: 'success', invalid: 'error' }[s] ?? 'default'
}

function onTableUpdate({ page: p, itemsPerPage: ipp }) {
  page.value = p
  itemsPerPage.value = ipp
  fetchSubmissions(p, ipp)
}

onMounted(() => fetchSubmissions())
</script>
