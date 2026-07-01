// Copia en frontend del catálogo de razones de D:\backoffice-api\feature\suspicious-shared\reason-catalog.js
// Mantener sincronizado a mano si se agrega/cambia una razón en el backend.
export const REASON_CATALOG = {
  BOT_DETECTED: {
    label: 'Bot detectado',
    severity: 'alto',
    color: 'red',
    description: 'El User-Agent del envío corresponde a un script (node, curl, python, axios, etc.), no a un navegador real. Un browser real siempre manda un string largo tipo "Mozilla/5.0 ...". Esto es evidencia técnica directa de que el envío no vino de la landing.'
  },
  INVALID_REFERENCE: {
    label: 'Referencias inválidas',
    severity: 'alto',
    color: 'red',
    description: 'Los pronósticos hacen referencia a partidos/grupos que no existen en esta fase (ej. IDs de una fase distinta). Indica manipulación directa del payload o reuso de datos de otra participación.'
  },
  INCOMPLETE_SUBMIT: {
    label: 'Envío incompleto (bypass del formulario)',
    severity: 'alto',
    color: 'red',
    description: 'El formulario de la landing nunca permite enviar sin completar todos los pronósticos. Si un registro llegó incompleto a la base de datos, significa que el envío no pasó por la landing sino que se llamó al API directamente.'
  },
  BREAK_WINDOW: {
    label: 'Enviado en horario suspendido',
    severity: 'alto',
    color: 'red',
    description: 'El envío ocurrió durante una ventana en la que la quiniela estaba cerrada manualmente (entre un "cerrar" y un "abrir" registrados en el historial de estados). No debería haber sido posible participar en ese momento.'
  },
  PID_DUP: {
    label: 'ID de submission duplicado',
    severity: 'alto',
    color: 'red',
    description: 'Existe más de un registro con el mismo ID de participación. No debería ocurrir nunca por el índice único de la base de datos — si aparece, algo escribió directamente sobre la base sin pasar por la validación del API.'
  },
  IP_DUP: {
    label: 'IP duplicada',
    severity: 'medio',
    color: 'orange',
    description: 'Más de un jugador distinto envió su participación desde la misma IP. Puede ser sospechoso (varias cuentas controladas por la misma persona) o tener una explicación inocente (wifi compartido, red corporativa, NAT de un operador móvil). Requiere revisar en conjunto con otras señales.'
  },
  ALIAS_DUP: {
    label: 'Alias repetido',
    severity: 'bajo',
    color: 'yellow',
    description: 'Más de un jugador usó el mismo alias/nombre visible. Es la señal más débil por sí sola — muchos alias coinciden por casualidad (nombres comunes, apodos genéricos).'
  }
}

export const SEVERITY_META = {
  critico: { label: 'Crítico', color: 'red-darken-3' },
  alto:    { label: 'Alto',    color: 'red' },
  medio:   { label: 'Medio',  color: 'orange' },
  bajo:    { label: 'Bajo',    color: 'yellow-darken-2' }
}

export const SEVERITY_ORDER = ['critico', 'alto', 'medio', 'bajo']

export function reasonOptions() {
  return Object.entries(REASON_CATALOG).map(([code, meta]) => ({ code, ...meta }))
}
