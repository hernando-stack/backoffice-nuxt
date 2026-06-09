<template>
  <div>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Grupos del Mundial</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Agregar grupo</v-btn>
    </div>

    <v-alert v-if="error" type="error" density="compact" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <v-card>
      <v-data-table-server
        :headers="headers"
        :items="groups"
        :items-length="total"
        :loading="loading"
        item-value="id"
        @update:options="onTableUpdate"
      >
        <template #item.teams="{ item }">
          <v-chip v-for="t in item.teams" :key="t.id" size="small" class="mr-1 mb-1">{{ t.name }}</v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
          <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openConfirmDelete(item)" />
        </template>
      </v-data-table-server>
    </v-card>

    <!-- Create / Edit dialog -->
    <v-dialog v-model="dialogOpen" max-width="520" :fullscreen="$vuetify.display.smAndDown">
      <v-card>
        <v-card-title class="pa-4">{{ isEditing ? 'Editar grupo' : 'Nuevo grupo' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="selectedGroup.groupId" label="Group ID (ej: group-a)" variant="outlined" class="mb-3" :disabled="isEditing" />
          <v-text-field v-model="selectedGroup.name" label="Nombre (ej: Grupo A)" variant="outlined" class="mb-4" />
          <div class="text-subtitle-2 mb-2">Equipos</div>
          <div v-for="(team, i) in selectedGroup.teams" :key="i" class="d-flex gap-2 mb-2">
            <v-text-field v-model="team.id" :label="`ID equipo ${i + 1}`" variant="outlined" density="compact" />
            <v-text-field v-model="team.name" :label="`Nombre equipo ${i + 1}`" variant="outlined" density="compact" />
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="dialogOpen = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="loading" @click="saveGroup(page, itemsPerPage)">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirm delete dialog -->
    <v-dialog v-model="confirmDeleteOpen" max-width="380">
      <v-card>
        <v-card-title>Eliminar grupo</v-card-title>
        <v-card-text>¿Eliminás el grupo <strong>{{ selectedGroup?.name }}</strong>? Esta acción no se puede deshacer.</v-card-text>
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
import { useQuinielaGroups } from '~/feature/quiniela-groups'

definePageMeta({ middleware: 'auth' })

const {
  groups, total, loading, error,
  dialogOpen, confirmDeleteOpen, selectedGroup, isEditing,
  fetchGroups, openCreate, openEdit, saveGroup, openConfirmDelete, confirmDelete
} = useQuinielaGroups()

const page = ref(1)
const itemsPerPage = ref(20)

const headers = [
  { title: 'Group ID', key: 'groupId', sortable: false },
  { title: 'Nombre', key: 'name', sortable: false },
  { title: 'Equipos', key: 'teams', sortable: false },
  { title: 'Acciones', key: 'actions', sortable: false, align: 'end' }
]

function onTableUpdate({ page: p, itemsPerPage: ipp }) {
  page.value = p
  itemsPerPage.value = ipp
  fetchGroups(p, ipp)
}

onMounted(() => fetchGroups())
</script>
