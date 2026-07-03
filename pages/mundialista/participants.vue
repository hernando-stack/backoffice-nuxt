<template>
  <div>
    <h1 class="text-h5 mb-4">Mundialista — Participantes</h1>

    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="participantes">Participantes</v-tab>
      <v-tab value="sospechosos">Sospechosos</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <v-window-item value="participantes">

    <!-- Filter bar -->
    <div class="mb-4">
      <div class="d-flex flex-column flex-sm-row gap-2 flex-wrap">
        <v-select
          v-model="filterPhase"
          :items="PHASES"
          item-title="label"
          item-value="id"
          label="Fase"
          placeholder="Todas las fases"
          variant="outlined"
          density="compact"
          hide-details
          clearable
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

    <v-alert v-if="exportInfo" type="info" density="compact" class="mb-4" closable @click:close="exportInfo = ''">
      {{ exportInfo }}
    </v-alert>
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
          total-visible="7"
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

        <!-- Bonus / preguntas de desempate (opcional, solo cuartos y campeón) -->
        <v-card v-if="selected.bonusAnswers?.length" variant="outlined" class="mt-4">
          <v-card-title class="text-subtitle-2">Preguntas Bonus (desempate)</v-card-title>
          <v-list density="compact">
            <v-list-item
              v-for="a in selected.bonusAnswers"
              :key="a.questionId"
              :title="a.questionId"
              :subtitle="String(a.answer)"
            />
          </v-list>
        </v-card>
      </div>
      <div v-else class="pa-4 text-center text-medium-emphasis">Cargando...</div>
    </v-navigation-drawer>

      </v-window-item>

      <v-window-item value="sospechosos">
        <div class="d-flex align-center mb-4 gap-3 flex-wrap">
          <v-btn color="warning" prepend-icon="mdi-magnify" :loading="running" @click="runDetection()">
            Buscar actividad sospechosa
          </v-btn>
          <v-btn
            prepend-icon="mdi-file-excel"
            variant="tonal"
            color="success"
            :loading="exporting"
            :disabled="!suspects.length"
            @click="exportExcel"
          >Exportar Excel</v-btn>
          <v-btn
            icon="mdi-information-outline"
            variant="text"
            density="comfortable"
            @click="showInfoModal = true"
          />
          <span v-if="suspectTotal" class="text-body-2 text-medium-emphasis">
            {{ suspectTotal }} entradas detectadas
          </span>
        </div>

        <div class="d-flex flex-column flex-sm-row gap-2 flex-wrap mb-4">
          <v-select
            v-model="filterSuspectPhase"
            :items="PHASES"
            item-title="label"
            item-value="id"
            label="Filtrar por fase"
            placeholder="Todas las fases"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            style="min-width: 180px"
            @update:model-value="fetchSuspects(1)"
          />
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
            @update:model-value="fetchSuspects(1)"
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
            @update:model-value="fetchSuspects(1)"
          />
        </div>

        <v-alert v-if="suspectError" type="error" density="compact" class="mb-4" closable @click:close="suspectError = ''">
          {{ suspectError }}
        </v-alert>

        <v-alert v-if="ipDupWarning" type="warning" variant="tonal" density="comfortable" class="mb-4" closable @click:close="ipDupWarning = null">
          <strong>{{ ipDupWarning.count }} de {{ ipDupWarning.submissionsTotal }} participaciones</strong>
          ({{ Math.round(ipDupWarning.ratio * 100) }}%) están marcadas como sospechosas solo por
          <strong>"IP duplicada"</strong>. Es muy probable que se deba a NAT de operadores móviles
          (muchos jugadores reales comparten la misma IP pública del operador), no necesariamente a trampa.
          Revisá esta señal en conjunto con otras (bot, referencias inválidas, envío incompleto) antes de
          marcar algo como inválido solo por esto.
        </v-alert>

        <v-card v-if="suspects.length">
          <v-data-table
            :headers="suspectHeaders"
            :items="suspects"
            :loading="suspectLoading"
            density="compact"
            item-value="id"
            items-per-page="-1"
            hide-default-footer
          >
            <template #item.severity="{ item }">
              <v-chip :color="severityColor(item.severity)" size="small">{{ severityLabel(item.severity) }}</v-chip>
            </template>
            <template #item.reason="{ item }">
              <v-tooltip v-for="r in item.reason" :key="r.code" :text="r.detail || r.label">
                <template #activator="{ props }">
                  <v-chip
                    v-bind="props"
                    :color="r.color"
                    size="x-small"
                    class="mr-1 mb-1"
                    style="cursor: pointer"
                    @click="openReasonModal(r, item)"
                  >{{ r.label }}</v-chip>
                </template>
              </v-tooltip>
            </template>
          </v-data-table>
          <div class="pa-3 d-flex justify-center">
            <v-pagination
              v-model="suspectPage"
              :length="Math.ceil(suspectTotal / suspectLimit)"
              total-visible="7"
              density="compact"
              @update:model-value="fetchSuspects"
            />
          </div>
        </v-card>

        <v-card v-else-if="!suspectLoading && !running" class="pa-8 text-center text-medium-emphasis" variant="outlined">
          Presioná "Buscar actividad sospechosa" para analizar las participaciones.
        </v-card>
      </v-window-item>
    </v-window>

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

    <SuspiciousReasonModal
      v-model="showReasonModal"
      :reason="selectedReason"
      :record="selectedRecord"
      system="mundialista"
    />

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
import { useMundialSuspicious } from '~/feature/mundialista-suspicious'
import { SEVERITY_META, SEVERITY_ORDER, reasonOptions } from '~/feature/suspicious-shared/reasonCatalog'
import SuspiciousReasonModal from '~/feature/suspicious-shared/SuspiciousReasonModal.vue'

definePageMeta({ middleware: 'auth' })

const activeTab = ref('participantes')

const {
  PHASES,
  submissions, total, loading, error, exportInfo,
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

const {
  suspects, loading: suspectLoading, running, exporting, error: suspectError,
  total: suspectTotal, page: suspectPage, limit: suspectLimit,
  filterCode, filterSeverity, filterPhase: filterSuspectPhase, ipDupWarning,
  fetchSuspects, runDetection, exportExcel, checkIpDupRatio
} = useMundialSuspicious()

const suspectHeaders = [
  { title: 'Alias',     key: 'alias',    sortable: false },
  { title: 'IP',        key: 'ip',       sortable: false },
  { title: 'Fase',      key: 'phaseId',  sortable: false },
  { title: 'Severidad', key: 'severity', sortable: false },
  { title: 'Razones',   key: 'reason',   sortable: false }
]

const showInfoModal = ref(false)

const showReasonModal = ref(false)
const selectedReason = ref(null)
const selectedRecord = ref(null)
function openReasonModal(reason, record) {
  selectedReason.value = reason
  selectedRecord.value = record
  showReasonModal.value = true
}

const reasonSelectItems = reasonOptions().map(r => ({ code: r.code, title: r.label }))
const severitySelectItems = SEVERITY_ORDER.map(s => ({ value: s, title: SEVERITY_META[s].label }))

function severityColor(sv) {
  return SEVERITY_META[sv]?.color ?? 'grey'
}
function severityLabel(sv) {
  return SEVERITY_META[sv]?.label ?? sv
}

onMounted(() => {
  fetchSubmissions()
  fetchSuspects()
  checkIpDupRatio()
})
</script>
