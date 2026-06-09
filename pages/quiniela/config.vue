<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Configuración</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Agregar</v-btn>
    </div>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <!-- Active config status control -->
    <v-card v-if="activeConfig" class="mb-4" :color="activeConfig.status === 'open' ? 'success' : 'error'" variant="tonal">
      <v-card-text class="d-flex flex-column flex-sm-row align-sm-center gap-3">
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-bold">
            {{ activeConfig.status === 'open' ? '✅ Inscripciones abiertas' : '🔒 Inscripciones cerradas' }}
          </div>
          <div class="text-body-2">
            Cierre automático: {{ new Date(activeConfig.cutoffAt).toLocaleString('es-AR') }}
          </div>
        </div>
        <v-btn
          :color="activeConfig.status === 'open' ? 'error' : 'success'"
          variant="flat"
          :loading="loading"
          @click="openConfirmToggle(activeConfig)"
        >
          {{ activeConfig.status === 'open' ? 'Cerrar inscripciones' : 'Reabrir inscripciones' }}
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- Mobile: card list -->
    <template v-if="$vuetify.display.smAndDown">
      <div v-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <template v-else>
        <v-card
          v-for="item in configs"
          :key="item.id"
          class="mb-3"
          variant="outlined"
        >
          <v-card-text class="pb-0">
            <div class="d-flex justify-space-between align-center mb-2">
              <v-chip :color="statusColor(item.status)" size="small">{{ item.status }}</v-chip>
              <span class="text-caption text-medium-emphasis">{{ new Date(item.cutoffAt).toLocaleString('es-AR') }}</span>
            </div>
            <div class="text-body-2">Premio: <strong>${{ item.prize?.toLocaleString('es-AR') }} {{ item.currency }}</strong></div>
            <div class="text-caption text-medium-emphasis">Dep. mínimo: {{ item.minDeposit }}</div>
          </v-card-text>
          <v-card-actions>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="openEdit(item)">Editar</v-btn>
            <v-spacer />
            <v-btn size="small" icon="mdi-delete" variant="text" color="error" @click="openConfirmDelete(item)" />
          </v-card-actions>
        </v-card>
      </template>
    </template>

    <!-- Desktop: data table -->
    <v-card v-else>
      <v-data-table
        :headers="headers"
        :items="configs"
        :loading="loading"
        item-value="id"
      >
        <template #item.status="{ item }">
          <v-chip :color="statusColor(item.status)" size="small">{{ item.status }}</v-chip>
        </template>
        <template #item.cutoffAt="{ item }">
          {{ new Date(item.cutoffAt).toLocaleString('es-AR') }}
        </template>
        <template #item.prize="{ item }">
          ${{ item.prize?.toLocaleString('es-AR') }} {{ item.currency }}
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openConfirmDelete(item)" />
        </template>
      </v-data-table>
    </v-card>

    <!-- Create / Edit dialog -->
    <v-dialog v-model="dialogOpen" max-width="480" :fullscreen="$vuetify.display.smAndDown">
      <v-card>
        <v-card-title class="pa-4">{{ isEditing ? 'Editar configuración' : 'Nueva configuración' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="selectedConfig.cutoffAt" label="Fecha de cierre" type="datetime-local" variant="outlined" class="mb-3" />
          <v-select v-model="selectedConfig.status" :items="statusOptions" label="Estado" variant="outlined" class="mb-3" />
          <v-text-field v-model="selectedConfig.prize" label="Premio" type="number" variant="outlined" class="mb-3" />
          <v-text-field v-model="selectedConfig.currency" label="Moneda" variant="outlined" class="mb-3" />
          <v-text-field v-model="selectedConfig.minDeposit" label="Depósito mínimo" type="number" variant="outlined" />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="loading" @click="saveConfig">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm toggle status -->
    <v-dialog v-model="confirmToggleOpen" max-width="420">
      <v-card>
        <v-card-title>
          {{ pendingToggleConfig?.status === 'open' ? 'Cerrar inscripciones' : 'Reabrir inscripciones' }}
        </v-card-title>
        <v-card-text>
          {{
            pendingToggleConfig?.status === 'open'
              ? 'Se van a cerrar las inscripciones. Los jugadores no podrán enviar predicciones hasta que las reactives. ¿Confirmás?'
              : 'Se van a reabrir las inscripciones. Los jugadores podrán enviar predicciones nuevamente. ¿Confirmás?'
          }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmToggleOpen = false">Cancelar</v-btn>
          <v-btn
            :color="pendingToggleConfig?.status === 'open' ? 'error' : 'success'"
            variant="flat"
            :loading="loading"
            @click="confirmToggle"
          >
            {{ pendingToggleConfig?.status === 'open' ? 'Sí, cerrar' : 'Sí, reabrir' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm delete -->
    <v-dialog v-model="confirmDeleteOpen" max-width="380">
      <v-card>
        <v-card-title>Eliminar configuración</v-card-title>
        <v-card-text>¿Eliminás esta configuración? Esta acción no se puede deshacer.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDeleteOpen = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" :loading="loading" @click="confirmDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useQuinielaConfig } from '~/feature/quiniela-config'

definePageMeta({ middleware: 'auth' })

const {
  configs, loading, error,
  dialogOpen, confirmDeleteOpen, confirmToggleOpen, pendingToggleConfig, selectedConfig, isEditing,
  fetchConfigs, openCreate, openEdit, saveConfig, openConfirmDelete, confirmDelete, openConfirmToggle, confirmToggle
} = useQuinielaConfig()

const activeConfig = computed(() => configs.value?.[0] ?? null)

const headers = [
  { title: 'Estado', key: 'status', sortable: false },
  { title: 'Fecha de cierre', key: 'cutoffAt', sortable: false },
  { title: 'Premio', key: 'prize', sortable: false },
  { title: 'Dep. mínimo', key: 'minDeposit', sortable: false },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

const statusOptions = ['open', 'closed', 'finished']

function statusColor(s) {
  return s === 'open' ? 'success' : s === 'closed' ? 'error' : 'default'
}

onMounted(() => fetchConfigs())
</script>
