<template>
  <v-dialog :model-value="modelValue" max-width="640" @update:model-value="$emit('update:modelValue', $event)">
    <v-card v-if="reason">
      <v-card-title class="d-flex align-center gap-2">
        <v-chip :color="reason.color" size="small">{{ reason.label }}</v-chip>
      </v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-3">{{ catalogEntry?.description }}</p>

        <v-alert v-if="reason.detail" type="info" variant="tonal" density="compact" class="mb-3">
          <strong>Detalle:</strong> {{ reason.detail }}
        </v-alert>

        <template v-if="isDuplicateType">
          <div class="text-overline mb-1">
            Otras participaciones con {{ reason.code === 'IP_DUP' ? `la IP ${record?.ip}` : `el alias "${record?.alias}"` }}
          </div>

          <div v-if="relatedLoading" class="text-center pa-4">
            <v-progress-circular indeterminate color="primary" size="24" />
          </div>
          <v-alert v-else-if="relatedError" type="error" density="compact">{{ relatedError }}</v-alert>
          <template v-else>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Alias</th>
                  <th>{{ system === 'mundialista' ? 'Fase' : 'Player ID' }}</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in relatedEntries" :key="e.id">
                  <td>{{ e.alias }}</td>
                  <td>{{ system === 'mundialista' ? e.phaseId : e.playerId }}</td>
                  <td>{{ e.status }}</td>
                  <td>{{ e.createdAt ? new Date(e.createdAt).toLocaleString('es-AR', { hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '—' }}</td>
                </tr>
              </tbody>
            </v-table>
            <div v-if="relatedTotal > relatedLimit" class="d-flex justify-center pa-2">
              <v-pagination
                v-model="relatedPage"
                :length="Math.ceil(relatedTotal / relatedLimit)"
                total-visible="5"
                density="compact"
                @update:model-value="fetchRelated"
              />
            </div>
            <p class="text-caption text-medium-emphasis mt-1">{{ relatedTotal }} participaciones en total con este valor.</p>
          </template>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">Cerrar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { REASON_CATALOG } from './reasonCatalog'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  reason: { type: Object, default: null },
  record: { type: Object, default: null },
  system: { type: String, required: true } // 'mundialista' | 'quiniela'
})
defineEmits(['update:modelValue'])

const { $axios } = useNuxtApp()

const relatedEntries = ref([])
const relatedTotal = ref(0)
const relatedPage = ref(1)
const relatedLimit = 20
const relatedLoading = ref(false)
const relatedError = ref('')

const catalogEntry = computed(() => props.reason ? REASON_CATALOG[props.reason.code] : null)
const isDuplicateType = computed(() => props.reason?.code === 'IP_DUP' || props.reason?.code === 'ALIAS_DUP')

async function fetchRelated(p = 1) {
  if (!props.reason || !props.record) return
  relatedPage.value = p
  relatedLoading.value = true
  relatedError.value = ''
  try {
    const endpoint = props.system === 'mundialista'
      ? '/backoffice/mundialista/submissions'
      : '/backoffice/quiniela/submissions'
    const params = { page: p, limit: relatedLimit }
    if (props.reason.code === 'IP_DUP') params.ip = props.record.ip
    if (props.reason.code === 'ALIAS_DUP') params.alias = props.record.alias
    const { data } = await $axios.get(endpoint, { params })
    relatedEntries.value = data.submissions ?? []
    relatedTotal.value = data.total ?? 0
  } catch (e) {
    relatedError.value = e.response?.data?.error ?? 'Error al cargar participaciones relacionadas'
  } finally {
    relatedLoading.value = false
  }
}

watch(() => [props.modelValue, props.reason], ([open]) => {
  if (open && isDuplicateType.value) {
    fetchRelated(1)
  }
}, { immediate: true })
</script>
