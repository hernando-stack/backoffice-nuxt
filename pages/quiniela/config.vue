<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Configuración de la Quiniela</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Agregar config</v-btn>
    </div>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-card>
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
  dialogOpen, confirmDeleteOpen, selectedConfig, isEditing,
  fetchConfigs, openCreate, openEdit, saveConfig, openConfirmDelete, confirmDelete
} = useQuinielaConfig()

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
