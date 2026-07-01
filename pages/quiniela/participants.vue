<template>
  <div>
    <h1 class="text-h5 mb-4">Participantes</h1>

    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="participantes">Participantes</v-tab>
      <v-tab value="sospechosos">Sospechosos</v-tab>
    </v-tabs>

    <v-tabs-window v-model="activeTab">
      <!-- ── TAB: PARTICIPANTES ── -->
      <v-tabs-window-item value="participantes">
    <!-- Filter bar -->
    <div class="mb-4">
      <div class="d-flex flex-column flex-sm-row gap-2">
        <v-text-field
          v-model="filterSearch"
          placeholder="Buscar alias o playerId..."
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
                <div class="text-caption text-medium-emphasis">{{ toCompany(item.playerId) }} · {{ item.playerId }}</div>
              </div>
              <v-chip :color="statusColor(item.status)" size="small">{{ item.status }}</v-chip>
            </div>
            <div class="text-caption mt-2 text-medium-emphasis">
              <span class="mr-3">Score: {{ item.score ?? '—' }}</span>
              <span>{{ new Date(item.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) }}</span>
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
        <template #item.company="{ item }">
          {{ toCompany(item.playerId) }}
        </template>
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" size="small">{{ item.status }}</v-chip>
        </template>
        <template #item.createdAt="{ item }">
          {{ new Date(item.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) }}
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
      :width="$vuetify.display.smAndDown ? '100%' : 420"
      temporary
    >
      <div class="pa-4" v-if="selectedSubmission">
        <div class="d-flex align-center mb-4">
          <v-btn icon="mdi-arrow-left" variant="text" size="small" class="mr-2" @click="drawerOpen = false" />
          <div class="text-h6 flex-grow-1">{{ selectedSubmission.alias }}</div>
          <v-btn icon="mdi-download" variant="text" size="small" @click="exportSingleCsv(selectedSubmission)" />
        </div>

        <v-card class="mb-4" variant="outlined">
          <v-card-title class="text-subtitle-2">Datos de seguridad</v-card-title>
          <v-list density="compact">
            <v-list-item title="Empresa" :subtitle="toCompany(selectedSubmission.playerId)" />
            <v-list-item title="Player ID" :subtitle="selectedSubmission.playerId" />
            <v-list-item title="IP" :subtitle="selectedSubmission.ip ?? '—'" />
            <v-list-item title="User Agent" :subtitle="selectedSubmission.userAgent ?? '—'" />
            <v-list-item title="Referrer" :subtitle="selectedSubmission.referrer ?? '—'" />
            <v-list-item title="Fecha" :subtitle="selectedSubmission.createdAt ? new Date(selectedSubmission.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '—'" />
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
          <v-list density="compact">
            <v-list-item
              v-for="pred in selectedSubmission.predictions"
              :key="pred.groupId"
              :title="pred.groupId"
            >
              <template #subtitle>
                <span
                  v-for="(teamId, i) in pred.orderedTeams"
                  :key="i"
                  class="mr-2"
                >{{ i + 1 }}° {{ teamId }}</span>
              </template>
            </v-list-item>
          </v-list>
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

      </v-tabs-window-item>

      <!-- ── TAB: SOSPECHOSOS ── -->
      <v-tabs-window-item value="sospechosos">
        <v-alert v-if="suspiciousError" type="error" density="compact" class="mb-4" closable @click:close="suspiciousError = ''">
          {{ suspiciousError }}
        </v-alert>

        <v-alert v-if="ipDupWarning" type="warning" variant="tonal" density="comfortable" class="mb-4" closable @click:close="ipDupWarning = null">
          <strong>{{ ipDupWarning.count }} de {{ ipDupWarning.submissionsTotal }} participaciones</strong>
          ({{ Math.round(ipDupWarning.ratio * 100) }}%) están marcadas como sospechosas solo por
          <strong>"IP duplicada"</strong>. Es muy probable que se deba a NAT de operadores móviles
          (muchos jugadores reales comparten la misma IP pública del operador), no necesariamente a trampa.
          Revisá esta señal en conjunto con otras antes de marcar algo como inválido solo por esto.
        </v-alert>

        <div class="d-flex align-center gap-3 mb-4 flex-wrap">
          <v-btn
            color="warning"
            prepend-icon="mdi-magnify-scan"
            :loading="detecting"
            @click="runDetection()"
          >
            Buscar actividad sospechosa
          </v-btn>
          <v-btn
            prepend-icon="mdi-file-excel"
            variant="tonal"
            color="success"
            :loading="exporting"
            :disabled="!suspiciousEntries.length"
            @click="exportExcel"
          >Exportar Excel</v-btn>
          <v-btn
            icon="mdi-information-outline"
            variant="text"
            density="comfortable"
            @click="showInfoModal = true"
          />
          <span v-if="scannedAt" class="text-caption text-medium-emphasis">
            Último escaneo: {{ new Date(scannedAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) }}
          </span>
        </div>

        <div class="d-flex flex-column flex-sm-row gap-2 flex-wrap mb-4">
          <v-select
            v-model="filterCode"
            :items="reasonSelectItems"
            item-title="title"
            item-value="code"
            label="Filtrar por tag"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            style="min-width: 220px"
            @update:model-value="fetchSuspicious"
          />
          <v-select
            v-model="filterSeverity"
            :items="severitySelectItems"
            item-title="title"
            item-value="value"
            label="Filtrar por severidad"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            style="min-width: 200px"
            @update:model-value="fetchSuspicious"
          />
        </div>

        <div v-if="suspiciousLoading" class="text-center pa-6">
          <v-progress-circular indeterminate color="warning" />
        </div>

        <template v-else-if="suspiciousEntries.length === 0 && scannedAt">
          <v-alert type="success" variant="tonal">No se detectaron entradas sospechosas en el último escaneo.</v-alert>
        </template>

        <template v-else-if="suspiciousEntries.length > 0">
          <!-- Mobile: card list -->
          <template v-if="$vuetify.display.smAndDown">
            <v-card
              v-for="entry in suspiciousEntries"
              :key="entry.id"
              class="mb-3"
              variant="outlined"
            >
              <v-card-text class="pb-1">
                <div class="d-flex justify-space-between align-start mb-1">
                  <div>
                    <div class="font-weight-bold text-body-1">{{ entry.alias }}</div>
                    <div class="text-caption text-medium-emphasis">{{ entry.playerId }}</div>
                  </div>
                  <v-chip :color="severityColor(entry.severity)" size="small">{{ severityLabel(entry.severity) }}</v-chip>
                </div>
                <div class="text-caption text-medium-emphasis mb-2">
                  <span class="mr-3">IP: {{ entry.ip ?? '—' }}</span>
                  <span>{{ entry.submittedAt ? new Date(entry.submittedAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '—' }}</span>
                </div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="r in entry.reasons"
                    :key="r.code"
                    :color="r.color"
                    size="small"
                  >
                    {{ r.label }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </template>

          <!-- Desktop: data table -->
          <v-card v-else>
            <v-data-table
              :headers="suspiciousHeaders"
              :items="suspiciousEntries"
              :loading="suspiciousLoading"
              item-value="id"
            >
              <template #item.severity="{ item }">
                <v-chip :color="severityColor(item.severity)" size="small">{{ severityLabel(item.severity) }}</v-chip>
              </template>
              <template #item.reasons="{ item }">
                <v-tooltip v-for="r in item.reasons" :key="r.code" :text="r.detail || r.label">
                  <template #activator="{ props }">
                    <v-chip v-bind="props" :color="r.color" size="small" class="mr-1 mb-1">{{ r.label }}</v-chip>
                  </template>
                </v-tooltip>
              </template>
              <template #item.submittedAt="{ item }">
                {{ item.submittedAt ? new Date(item.submittedAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '—' }}
              </template>
            </v-data-table>
          </v-card>
        </template>
      </v-tabs-window-item>

    </v-tabs-window>

    <!-- Info modal: qué significa cada tag de sospechoso -->
    <v-dialog v-model="showInfoModal" max-width="640">
      <v-card>
        <v-card-title>¿Qué significa cada tag?</v-card-title>
        <v-card-text>
          <div v-for="sev in SEVERITY_ORDER" :key="sev" class="mb-4">
            <div class="text-overline mb-1">
              <v-chip :color="SEVERITY_META[sev].color" size="small" class="mr-2">{{ SEVERITY_META[sev].label }}</v-chip>
            </div>
            <div
              v-for="opt in reasonOptions().filter(r => r.severity === sev)"
              :key="opt.code"
              class="mb-2 pl-2"
              style="border-left: 3px solid rgba(0,0,0,0.1)"
            >
              <div class="font-weight-bold">{{ opt.label }}</div>
              <div class="text-body-2 text-medium-emphasis">{{ opt.description }}</div>
            </div>
          </div>
          <p class="text-caption text-medium-emphasis mt-2">
            La severidad general de un registro se calcula combinando todas sus razones: 2 o más razones "Alto" juntas escalan a "Crítico".
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showInfoModal = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useQuinielaSubmissions } from '~/feature/quiniela-submissions'
import { useQuinielaSuspicious } from '~/feature/quiniela-suspicious/useQuinielaSuspicious'
import { SEVERITY_META, SEVERITY_ORDER, reasonOptions } from '~/feature/suspicious-shared/reasonCatalog'

definePageMeta({ middleware: 'auth' })

const activeTab = ref('participantes')

const {
  submissions, total, loading, error,
  drawerOpen, selectedSubmission, filterStatus, filterSearch,
  confirmDeleteOpen,
  fetchSubmissions, openDrawer, updateStatus, openConfirmDelete, confirmDelete,
  exportSingleCsv, exportAllCsv, toCompany
} = useQuinielaSubmissions()

const {
  entries: suspiciousEntries,
  loading: suspiciousLoading,
  detecting,
  exporting,
  error: suspiciousError,
  scannedAt,
  filterCode,
  filterSeverity,
  ipDupWarning,
  fetchSuspicious,
  runDetection,
  exportExcel
} = useQuinielaSuspicious()

const showInfoModal = ref(false)

const reasonSelectItems = reasonOptions().map(r => ({ code: r.code, title: r.label }))
const severitySelectItems = SEVERITY_ORDER.map(s => ({ value: s, title: SEVERITY_META[s].label }))

function severityColor(sv) {
  return SEVERITY_META[sv]?.color ?? 'grey'
}
function severityLabel(sv) {
  return SEVERITY_META[sv]?.label ?? sv
}

const page = ref(1)
const itemsPerPage = ref(20)

const headers = [
  { title: 'Alias', key: 'alias', sortable: false },
  { title: 'Empresa', key: 'company', sortable: false },
  { title: 'Player ID', key: 'playerId', sortable: false },
  { title: 'Estado', key: 'status', sortable: false },
  { title: 'Score', key: 'score', sortable: false },
  { title: 'IP', key: 'ip', sortable: false },
  { title: 'Fecha', key: 'createdAt', sortable: false },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

const suspiciousHeaders = [
  { title: 'Alias', key: 'alias', sortable: false },
  { title: 'Player ID', key: 'playerId', sortable: false },
  { title: 'IP', key: 'ip', sortable: false },
  { title: 'Fecha envío', key: 'submittedAt', sortable: false },
  { title: 'Severidad', key: 'severity', sortable: false },
  { title: 'Motivos', key: 'reasons', sortable: false }
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

onMounted(() => {
  fetchSubmissions()
  fetchSuspicious()
})
</script>
