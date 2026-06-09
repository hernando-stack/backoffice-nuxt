<script setup>
definePageMeta({ middleware: 'auth' })
const router = useRouter()
onMounted(() => router.replace('/quiniela/groups'))
</script>
<template><div /></template>
