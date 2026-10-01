// =========================================================
// Legado Patrimonial WSS — servir el portal en local, en modo producción
// scripts/servir-portal-local.mjs  ·  se lanza con `npm run start:local`
//
// La Mesa de estudio queda apagada en producción salvo que exista
// ESTUDIO_HABILITADO=true (src/lib/estudio/disponibilidad.ts). Ese apagado
// protege a un despliegue cuya base no tiene el esquema de la Mesa, como
// Supabase. El portal local sí lo tiene, así que este arranque la enciende
// siempre, sin depender de que alguien recuerde definir la variable a mano.
//
// No toca .env*: la variable vive solo en el proceso del servidor que lanza.
// Requiere un `npm run build` previo.
// =========================================================

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const next = require.resolve('next/dist/bin/next')
const puerto = process.env.PORT ?? '3000'

const hijo = spawn(process.execPath, [next, 'start', '-p', puerto, '-H', '127.0.0.1'], {
  stdio: 'inherit',
  env: { ...process.env, ESTUDIO_HABILITADO: 'true' },
})

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => hijo.kill(senal))
}
hijo.on('exit', (codigo) => process.exit(codigo ?? 0))
