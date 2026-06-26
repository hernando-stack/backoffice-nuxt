<template>
  <div>
    <h1 class="text-h5 mb-4">Mundialista — Fases</h1>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <div v-if="loading && !phases.length" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-for="p in phases" :key="p.id" class="mb-3" variant="outlined">
      <v-card-text>
        <div class="d-flex flex-column flex-sm-row align-sm-center gap-3">
          <div class="flex-grow-1">
            <div class="d-flex align-center gap-2 mb-1 flex-wrap">
              <span class="text-subtitle-1 font-weight-bold">{{ p.title }}</span>
              <v-chip :color="phaseStatus(p).color" size="small">{{ phaseStatus(p).label }}</v-chip>
              <v-chip v-if="p.forceStatus" color="warning" size="x-small" variant="tonal">
                modo manual
              </v-chip>
            </div>
            <div class="text-body-2 text-medium-emphasis">
              Apertura: {{ fmtDate(p.startDate) }} · Cierre: {{ fmtDate(p.endDate) }}
            </div>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <v-btn size="small" variant="tonal" prepend-icon="mdi-pencil" @click="openEdit(p)">
              Fechas
            </v-btn>
            <v-btn
              v-if="!p.isOpen || p.forceStatus === 'closed'"
              size="small" color="success" variant="flat"
              :loading="loading"
              @click="selectedPhase = p; confirmForceOpen = true"
            >
              Abrir ahora
            </v-btn>
            <v-btn
              v-if="p.isOpen || p.forceStatus === 'open'"
              size="small" color="error" variant="flat"
              :loading="loading"
              @click="selectedPhase = p; confirmForceClose = true"
            >
              Cerrar ahora
            </v-btn>
            <v-btn
              v-if="p.forceStatus"
              size="small" variant="text"
              :loading="loading"
              @click="setAuto(p)"
            >
              Volver a auto
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Edit dates dialog -->
    <v-dialog v-model="editDialog" max-width="480">
      <v-card>
        <v-card-title class="pa-4">Editar fechas — {{ selectedPhase?.title }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editForm.startDate"
            label="Apertura (hora Argentina)"
            type="datetime-local"
            variant="outlined"
            class="mb-3"
          />
          <v-text-field
            v-model="editForm.endDate"
            label="Cierre (hora Argentina)"
            type="datetime-local"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="loading" @click="saveEdit">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm force open -->
    <v-dialog v-model="confirmForceOpen" max-width="420">
      <v-card>
        <v-card-title>Abrir fase ahora</v-card-title>
        <v-card-text>
          Se abrirán las inscripciones para <strong>{{ selectedPhase?.title }}</strong> inmediatamente,
          independientemente de las fechas configuradas. ¿Confirmás?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmForceOpen = false">Cancelar</v-btn>
          <v-btn color="success" variant="flat" :loading="loading" @click="forceOpen(selectedPhase)">
            Sí, abrir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm force close -->
    <v-dialog v-model="confirmForceClose" max-width="420">
      <v-card>
        <v-card-title>Cerrar fase ahora</v-card-title>
        <v-card-text>
          Se cerrarán las inscripciones para <strong>{{ selectedPhase?.title }}</strong> inmediatamente.
          Los jugadores no podrán enviar pronósticos hasta que la reactives. ¿Confirmás?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmForceClose = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" :loading="loading" @click="forceClose(selectedPhase)">
            Sí, cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { useMundialistaPhases } from '~/feature/mundialista-phases'

definePageMeta({ middleware: 'auth' })

const {
  phases, loading, error,
  editDialog, confirmForceOpen, confirmForceClose, selectedPhase, editForm,
  fetchPhases, openEdit, saveEdit, forceOpen, forceClose, setAuto, fmtDate, phaseStatus
} = useMundialistaPhases()

onMounted(() => fetchPhases())
</script>
