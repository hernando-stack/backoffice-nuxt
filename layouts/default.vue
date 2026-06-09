<template>
  <v-app>
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail && mdAndUp"
      :permanent="mdAndUp"
      :temporary="!mdAndUp"
    >
      <v-list-item prepend-icon="mdi-soccer" title="Quiniela BO" nav>
        <template #append>
          <v-btn
            v-if="mdAndUp"
            :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            variant="text"
            @click="rail = !rail"
          />
        </template>
      </v-list-item>
      <v-divider />
      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-account-group" title="Grupos" to="/quiniela/groups" @click="closeOnMobile" />
        <v-list-item prepend-icon="mdi-cog" title="Configuración" to="/quiniela/config" @click="closeOnMobile" />
        <v-list-item prepend-icon="mdi-account-multiple" title="Participantes" to="/quiniela/participants" @click="closeOnMobile" />
      </v-list>
      <template #append>
        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-logout" title="Cerrar sesión" @click="logout" />
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-app-bar color="primary" flat>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-app-bar-title>Quiniela Mundialista 2026</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useDisplay } from 'vuetify'

const { mdAndUp } = useDisplay()
const drawer = ref(mdAndUp.value)
const rail = ref(false)
const router = useRouter()

function closeOnMobile() {
  if (!mdAndUp.value) drawer.value = false
}

function logout() {
  localStorage.removeItem('bo_token')
  router.push('/login')
}
</script>
