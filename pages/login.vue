<template>
  <v-app style="background:#F5F5F5">
    <v-main class="bg-surface">
      <v-container class="d-flex align-center justify-center" style="min-height:100vh">
        <v-card width="380" class="pa-6">
          <div class="text-center mb-4">
            <v-icon size="48" color="primary">mdi-soccer</v-icon>
            <div class="text-h6 mt-2">Quiniela Mundialista 2026</div>
            <div class="text-caption text-medium-emphasis">Backoffice</div>
          </div>

          <v-form @submit.prevent="login">
            <v-text-field
              v-model="form.username"
              label="Usuario"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              class="mb-3"
              :disabled="loading"
            />
            <v-text-field
              v-model="form.password"
              label="Contraseña"
              type="password"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              class="mb-4"
              :disabled="loading"
            />
            <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
            <v-btn type="submit" color="primary" block size="large" :loading="loading">
              Ingresar
            </v-btn>
          </v-form>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
definePageMeta({ layout: 'blank' })
const config = useRuntimeConfig()
const router = useRouter()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const error = ref('')

async function login() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${config.public.apiUrl}/backoffice/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Credenciales incorrectas')
    localStorage.setItem('bo_token', data.token)
    router.push('/quiniela/groups')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>
