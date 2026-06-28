<template>
  <div>
    <h1 class="text-h5 mb-4">Mundialista — Partidos</h1>

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
        @update:model-value="fetchMatches"
      />
      <v-btn prepend-icon="mdi-file-excel" variant="tonal" color="success" @click="fileInputRef.click()">
        Importar Excel
      </v-btn>
      <input ref="fileInputRef" type="file" accept=".xlsx,.xls" style="display:none" @change="e => { onFileChange(e.target.files[0]); e.target.value = '' }" />
    </div>

    <v-alert v-if="importErrors.length" type="warning" density="compact" class="mb-4">
      <div v-for="(e, i) in importErrors" :key="i">{{ e }}</div>
    </v-alert>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <div v-if="loading && !matches.length" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-if="matches.length">
      <v-data-table
        :headers="headers"
        :items="matches"
        :loading="loading"
        item-value="id"
        density="compact"
      >
        <template #item.date="{ item }">{{ fmtDate(item.date) }}</template>
        <template #item.teamA="{ item }">{{ item.teamA.name }}</template>
        <template #item.teamB="{ item }">{{ item.teamB.name }}</template>
        <template #item.allowDraw="{ item }">{{ item.allowDraw ? 'Sí' : 'No' }}</template>
        <template #item.result="{ item }">
          <v-chip v-if="item.result" size="x-small" color="primary">{{ item.result }}</v-chip>
          <span v-else class="text-medium-emphasis text-caption">—</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDelete(item)" />
        </template>
      </v-data-table>
    </v-card>

    <v-card v-else-if="!loading" class="pa-8 text-center text-medium-emphasis" variant="outlined">
      No hay partidos cargados para esta fase. Importá un Excel o agregá partidos manualmente.
    </v-card>

    <!-- Excel import preview dialog -->
    <v-dialog v-model="importDialog" max-width="700">
      <v-card>
        <v-card-title class="pa-4">Confirmar importación — {{ importPreview.length }} partidos</v-card-title>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Fecha (AR)</th>
                <th>Equipo A</th>
                <th>Equipo B</th>
                <th>Empate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in importPreview" :key="i">
                <td>{{ fmtDate(m.date) }}</td>
                <td>{{ m.teamA }}</td>
                <td>{{ m.teamB }}</td>
                <td>{{ m.allowDraw ? 'Sí' : 'No' }}</td>
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

    <!-- Edit match dialog -->
    <v-dialog v-model="editDialog" max-width="480">
      <v-card>
        <v-card-title class="pa-4">Editar partido</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editForm.date"
            label="Fecha/Hora (hora Argentina)"
            type="datetime-local"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="editForm.teamA"
            label="Equipo A (nombre en español)"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="editForm.teamB"
            label="Equipo B (nombre en español)"
            variant="outlined"
            class="mb-3"
          />
          <v-checkbox v-model="editForm.allowDraw" label="Permitir empate" density="compact" hide-details />
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
        <v-card-title>Eliminar partido</v-card-title>
        <v-card-text>
          ¿Eliminás <strong>{{ deletingMatch?.teamA?.name }} vs {{ deletingMatch?.teamB?.name }}</strong>?
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
import { useMundialistaMatches } from '~/feature/mundialista-matches'

definePageMeta({ middleware: 'auth' })

const fileInputRef = ref(null)

const {
  PHASE_LIST, selectedPhaseId, matches, loading, error,
  importPreview, importErrors, importDialog, importLoading,
  editDialog, editingMatch, editForm,
  deleteDialog, deletingMatch,
  fetchMatches, onFileChange, confirmImport,
  openEdit, saveEdit, openDelete, confirmDelete, fmtDate
} = useMundialistaMatches()

const headers = [
  { title: 'Fecha (AR)',  key: 'date',      sortable: false },
  { title: 'Equipo A',   key: 'teamA',     sortable: false },
  { title: 'Equipo B',   key: 'teamB',     sortable: false },
  { title: 'Empate',     key: 'allowDraw', sortable: false },
  { title: 'Resultado',  key: 'result',    sortable: false },
  { title: 'Acciones',   key: 'actions',   sortable: false, align: 'end' }
]

onMounted(() => fetchMatches())
</script>
