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
              Fechas / Premio
            </v-btn>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-help-circle-outline" @click="openBonusEdit(p)">
              Preguntas Bonus{{ p.bonusQuestions?.length ? ` (${p.bonusQuestions.length})` : '' }}
            </v-btn>
            <v-btn
              v-if="p.type === 'CHAMPION_PICK'"
              size="small" variant="tonal" prepend-icon="mdi-shield-account-outline"
              @click="openTeamsEdit(p)"
            >
              Equipos{{ p.qualifiedTeamIds?.length ? ` (${p.qualifiedTeamIds.length})` : ' (todos)' }}
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

    <!-- Edit dates + prize dialog -->
    <v-dialog v-model="editDialog" max-width="480">
      <v-card>
        <v-card-title class="pa-4">Editar fase — {{ selectedPhase?.title }}</v-card-title>
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
            class="mb-3"
          />
          <v-text-field
            v-model.number="editForm.prizePool"
            label="Premio (ARS)"
            type="number"
            variant="outlined"
            prefix="$"
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="editDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="loading" @click="saveEdit">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bonus questions dialog -->
    <v-dialog v-model="bonusDialog" max-width="900">
      <v-card>
        <v-card-title class="pa-4">Preguntas Bonus — {{ selectedPhase?.title }}</v-card-title>
        <v-card-text>
          <v-alert v-if="bonusForm.length === 0" type="info" density="compact" variant="tonal" class="mb-3">
            Esta fase no tiene preguntas bonus. Agregá una para crear un criterio de desempate.
          </v-alert>

          <v-card v-for="(row, i) in bonusForm" :key="i" variant="outlined" class="mb-3 pa-3">
            <div class="d-flex gap-2 flex-wrap mb-2">
              <v-text-field v-model="row.id" label="ID (sin espacios)" density="compact" variant="outlined" style="max-width:220px" />
              <v-select v-model="row.type" :items="BONUS_TYPES" item-title="title" item-value="value" label="Tipo" density="compact" variant="outlined" style="max-width:200px" />
              <v-text-field v-model="row.icon" label="Ícono" density="compact" variant="outlined" style="max-width:100px" />
              <v-checkbox v-model="row.required" label="Obligatoria" density="compact" hide-details style="max-width:150px" />
              <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="removeBonusQuestion(i)" />
            </div>
            <v-text-field v-model="row.label" label="Pregunta (texto que ve el jugador)" density="compact" variant="outlined" class="mb-2" />
            <div v-if="row.type === 'number'" class="d-flex gap-2">
              <v-text-field v-model.number="row.min" label="Mínimo" type="number" density="compact" variant="outlined" style="max-width:150px" />
              <v-text-field v-model.number="row.max" label="Máximo" type="number" density="compact" variant="outlined" style="max-width:150px" />
            </div>
            <v-text-field
              v-if="row.type === 'choice'"
              v-model="row.optionsCsv"
              label="Opciones (formato: valor:etiqueta, separadas por coma)"
              hint="Ej: 0:0, 1:1, 2:2, 3:3, 4:4"
              persistent-hint
              density="compact" variant="outlined"
            />
            <v-text-field
              v-if="row.type === 'team-select'"
              v-model="row.excludeCsv"
              label="Excluir preguntas (IDs separados por coma; usá 'champion' para excluir al campeón elegido)"
              density="compact" variant="outlined"
            />
          </v-card>

          <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addBonusQuestion">Agregar pregunta</v-btn>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="bonusDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="loading" @click="saveBonusEdit">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Qualified teams dialog -->
    <v-dialog v-model="teamsDialog" max-width="600">
      <v-card>
        <v-card-title class="pa-4">Equipos clasificados — {{ selectedPhase?.title }}</v-card-title>
        <v-card-text>
          <v-alert type="info" density="compact" variant="tonal" class="mb-3">
            Sin equipos seleccionados = se muestran los 44 equipos completos (comportamiento actual).
            Marcá solo los que van a estar realmente disponibles para elegir.
          </v-alert>
          <v-autocomplete
            v-model="teamsForm"
            :items="allTeams"
            item-title="name"
            item-value="id"
            label="Equipos disponibles para esta fase"
            variant="outlined"
            multiple
            chips
            closable-chips
          />
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="teamsDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="loading" @click="saveTeamsEdit">Guardar</v-btn>
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
  fetchPhases, openEdit, saveEdit, forceOpen, forceClose, setAuto, fmtDate, phaseStatus,
  bonusDialog, bonusForm, BONUS_TYPES,
  openBonusEdit, addBonusQuestion, removeBonusQuestion, saveBonusEdit,
  teamsDialog, teamsForm, allTeams,
  openTeamsEdit, saveTeamsEdit
} = useMundialistaPhases()

onMounted(() => fetchPhases())
</script>
