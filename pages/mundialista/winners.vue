<template>
  <div>
    <h1 class="text-h5 mb-4">Mundialista — Ganadores</h1>

    <div class="d-flex flex-wrap gap-3 align-center mb-4">
      <v-select
        v-model="selectedPhaseId"
        :items="PHASE_LIST"
        item-title="label"
        item-value="id"
        label="Fase"
        variant="outlined"
        density="compact"
        hide-details
        style="min-width: 220px"
        @update:model-value="fetchWinners"
      />
      <v-btn prepend-icon="mdi-plus" variant="tonal" color="primary" @click="openAdd">
        Agregar ganador
      </v-btn>
      <v-btn prepend-icon="mdi-file-excel" variant="tonal" color="success" @click="openFilePicker">
        Importar Excel
      </v-btn>
      <input ref="fileInputRef" type="file" accept=".xlsx,.xls" style="display:none" @change="e => { onFileChange(e.target.files[0]); e.target.value = '' }" />
      <v-btn prepend-icon="mdi-download" variant="tonal" @click="openDownload">
        Descargar Excel
      </v-btn>
    </div>

    <v-alert v-if="importErrors.length" type="warning" density="compact" class="mb-4">
      <div v-for="(e, i) in importErrors" :key="i">{{ e }}</div>
    </v-alert>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <div v-if="loading && !winners.length" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-if="winners.length">
      <v-data-table
        :headers="headers"
        :items="winners"
        :loading="loading"
        item-value="id"
        density="compact"
      >
        <template #item.prize="{ item }">{{ item.prize }}</template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-card v-else-if="!loading" class="pa-8 text-center text-medium-emphasis" variant="outlined">
      No hay ganadores cargados para esta fase. Importá un Excel o agregá manualmente.
    </v-card>

    <!-- Excel import preview dialog -->
    <v-dialog v-model="importDialog" max-width="700">
      <v-card>
        <v-card-title class="pa-4">Confirmar importación — {{ importPreview.length }} ganadores</v-card-title>
        <v-alert type="info" density="compact" class="mx-4 mb-2">
          Fase destino: <strong>{{ PHASE_LIST.find(p => p.id === importPhaseId)?.label ?? importPhaseId }}</strong>
        </v-alert>
        <v-alert type="warning" density="compact" class="mx-4">Esto reemplazará TODOS los ganadores actuales de esta fase.</v-alert>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Alias</th>
                <th>Casino</th>
                <th>Puntos</th>
                <th>Premio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(w, i) in importPreview" :key="i">
                <td>{{ w.position }}</td>
                <td>{{ w.alias }}</td>
                <td>{{ w.casino }}</td>
                <td>{{ w.points }}</td>
                <td>{{ w.prize }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="importDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="importLoading" @click="confirmImport">
            Confirmar importación
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Download scope dialog -->
    <v-dialog v-model="downloadDialog" max-width="420">
      <v-card>
        <v-card-title class="pa-4">Descargar Excel</v-card-title>
        <v-card-text>
          ¿Querés descargar los ganadores de todas las fases o solo de la fase actual
          (<strong>{{ PHASE_LIST.find(p => p.id === selectedPhaseId)?.label }}</strong>)?
        </v-card-text>
        <v-card-actions class="pa-4 flex-wrap">
          <v-spacer />
          <v-btn variant="text" @click="downloadDialog = false">Cancelar</v-btn>
          <v-btn variant="tonal" @click="downloadCurrentPhase">Solo fase actual</v-btn>
          <v-btn color="primary" variant="flat" :loading="downloadAllLoading" @click="downloadAllPhases">
            Todas las fases
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add winner dialog -->
    <v-dialog v-model="addDialog" max-width="480">
      <v-card>
        <v-card-title class="pa-4">Agregar ganador</v-card-title>
        <v-card-text>
          <v-text-field v-model.number="addForm.position" label="Posición" type="number" variant="outlined" class="mb-3" />
          <v-text-field v-model="addForm.alias" label="Alias" variant="outlined" class="mb-3" />
          <v-text-field v-model="addForm.casino" label="Casino" variant="outlined" class="mb-3" />
          <v-text-field v-model.number="addForm.points" label="Puntos" type="number" variant="outlined" class="mb-3" />
          <v-text-field v-model="addForm.prize" label="Premio (ej: $ 500.000)" variant="outlined" class="mb-3" />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="addDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="addLoading" @click="confirmAdd">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit winner dialog -->
    <v-dialog v-model="editDialog" max-width="480">
      <v-card>
        <v-card-title class="pa-4">Editar ganador</v-card-title>
        <v-card-text>
          <v-text-field v-model.number="editForm.position" label="Posición" type="number" variant="outlined" class="mb-3" />
          <v-text-field v-model="editForm.alias" label="Alias" variant="outlined" class="mb-3" />
          <v-text-field v-model="editForm.casino" label="Casino" variant="outlined" class="mb-3" />
          <v-text-field v-model.number="editForm.points" label="Puntos" type="number" variant="outlined" class="mb-3" />
          <v-text-field v-model="editForm.prize" label="Premio (ej: $ 500.000)" variant="outlined" class="mb-3" />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="loading" @click="saveEdit">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="deleteDialog" max-width="380">
      <v-card>
        <v-card-title>Eliminar ganador</v-card-title>
        <v-card-text>
          ¿Eliminás a <strong>{{ deletingWinner?.alias }}</strong> (posición {{ deletingWinner?.position }})?
          Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" :loading="loading" @click="confirmDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useMundialistaWinners } from '~/feature/mundialista-winners'

definePageMeta({ middleware: 'auth' })

const fileInputRef = ref(null)
function openFilePicker() { fileInputRef.value?.click() }

const {
  PHASE_LIST, selectedPhaseId, winners, loading, error,
  importPreview, importErrors, importDialog, importLoading, importPhaseId,
  downloadDialog, downloadAllLoading,
  addDialog, addForm, addLoading,
  editDialog, editingWinner, editForm,
  deleteDialog, deletingWinner,
  fetchWinners, onFileChange, confirmImport,
  openDownload, downloadCurrentPhase, downloadAllPhases,
  openAdd, confirmAdd, openEdit, saveEdit, openDelete, confirmDelete
} = useMundialistaWinners()

const headers = [
  { title: 'Posición', key: 'position', sortable: false },
  { title: 'Alias',    key: 'alias',    sortable: false },
  { title: 'Casino',   key: 'casino',   sortable: false },
  { title: 'Puntos',   key: 'points',   sortable: false },
  { title: 'Premio',   key: 'prize',    sortable: false },
  { title: 'Acciones', key: 'actions',  sortable: false, align: 'end' }
]

onMounted(() => fetchWinners())
</script>
