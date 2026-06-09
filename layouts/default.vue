<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :rail="rail" permanent>
      <v-list-item prepend-icon="mdi-soccer" title="Quiniela BO" nav>
        <template #append>
          <v-btn :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
                 variant="text" @click="rail = !rail" />
        </template>
      </v-list-item>
      <v-divider />
      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-account-group" title="Grupos" to="/quiniela/groups" />
        <v-list-item prepend-icon="mdi-cog" title="Configuración" to="/quiniela/config" />
        <v-list-item prepend-icon="mdi-account-multiple" title="Participantes" to="/quiniela/participants" />
      </v-list>
      <template #append>
        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-logout" title="Cerrar sesión" @click="logout" />
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-app-bar color="primary" flat>
      <v-app-bar-nav-icon class="d-md-none" @click="drawer = !drawer" />
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
const drawer = ref(true)
const rail = ref(false)
const router = useRouter()

function logout() {
  localStorage.removeItem('bo_token')
  router.push('/login')
}
</script>
