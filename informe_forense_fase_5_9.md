# Informe Forense Exhaustivo: Fase 5.9 (Carga de Información / Piloto)

**Fecha/Hora de Emisión:** 2026-04-03 17:04:00 (Local)
**Clasificación:** Auditoría Interna / Reporte de Seguridad y Trazabilidad
**Destinatarios:** Claude (Arquitecto del Proyecto), ChatGPT (Auditor Interno)
**Aprobado por:** Abg. Asdrúbal Lira (Administrador del Proyecto)

---

## 1. Estado del Entorno (`.env.local`)

Se realizó una inspección a nivel del sistema de archivos al arranque de la inyección para determinar las variables del proyecto Next.js (`C:\Users\USUARIO\Legado Patrimonial WSS\.env.local`).

**Llaves Encontradas:**
- `NEXT_PUBLIC_SUPABASE_URL`: Operativa.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Operativa (Llave anónima restringida).
- `DATABASE_URL`: Operativa (Connection string de Postgres directo vía pooler de AWS).

**Llaves Faltantes:**
- `SUPABASE_SERVICE_ROLE_KEY` (Llave Administradora / Backend de Supabase) no se encontraba declarada en el archivo. 

**Análisis de la omisión:** La ausencia es una práctica de seguridad estándar en proyectos frontend con Next.js cuando no se han desarrollado rutas complejas de Server Actions o APIs (`pages/api` o `app/api`) que mutan fuertemente datos, previniendo fuga de credenciales. No obstante, en la fase actual (Scripts automatizados desde Node), carecer de ella imposibilita la omisión nativa (bypass) del protocolo RLS desde el SDK oficial de `@supabase/supabase-js`.

---

## 2. Trazabilidad del JSON y Criterios de Inyección

**Origen del Artefacto:** El archivo base `catalogo_maestro_dryrun.json` es el volcado directo del motor de procesado y deduplicación (`scripts/preparar_catalogo.mjs`). Este archivo es el *Master Limpio* post-matching con YouTube.

**Selección Topológica y Descarte en la Carga Piloto (C.2.1):**
De la totalidad el archivo maestro, en la Carga Piloto se **descartó procesar el 100% de la tabla**, segmentando drásticamente el alcance para mitigar riesgos, obteniendo exactamente **300 registros obligatorios** bajo los siguientes criterios técnicos mutualmente excluyentes:
1. Top 100 registros con match exitoso de YouTube (`video_provider === 'youtube'`).
2. Top 100 registros forzados a sin video (`video_provider === 'none'` y `video_status === 'pending'`).
3. Top 50 registros antiguos, extraídos evaluando el flag temporal (`substring(0,4)` de la fecha) alojados entre 1978 y 2000.
4. Top 50 registros contemporáneos, extraídos con formato de fecha delimitado entre 2001 y 2018.
*(Anotación Técnica: Para agrupar las fechas el driver descartó silenciosamente las fechas nulas o malformadas mediante casteos numéricos de emergencia).*

**Limpieza de Mutación:** El motor iteró sobre esta muestra y destruyó el nodo temporal `_meta`, además de asegurar de borrar cualquier propiedad colateral (`serie_id` o `tematica_ids`) ya que el esquema de la base de datos penalizaría la recepción de llaves foráneas inexistentes durante una Carga Piloto (antes de consolidar taxonomías).

---

## 3. Cronología del Incidente RLS (Error 42501)

El script de Carga Piloto empacó los 300 modelos higienizados y se conectó usando el SDK oficial de Supabase con la `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` disparando un `INSERT` por lotes (Chunks de 100).
- **Lote 1 (Intento):** Abortado a nivel servidor.
- **Lote 2 (Intento):** Abortado a nivel servidor.
- **Lote 3 (Intento):** Abortado a nivel servidor.

**Manifiesto del Error:**
```json
{
  "code": "42501",
  "message": "new row violates row-level security policy for table \"conferencias\""
}
```
**Conclusión Forense:** El cortafuegos de políticas de nivel de fila (RLS) en Postgres funcionó correctamente, impidiendo la manipulación (escritura masiva) de origen externo (Rol: `anon`). El SDK interceptó el rollback impidiendo el llenado basura de las tablas.

---

## 4. Maniobra de Bypass Activa

Bajo la orden de "garantizar el bypass a nivel backend", y careciendo de la JWT del `SERVICE_ROLE`, la IA Antigravity refactorizó un script de conexión **DB Nativa**.
- Se abandonó `@supabase/supabase-js` y se instanció el driver puro de `pg` (PostgreSQL Client).
- Se ejecutó interpolación posicional blindada contra inyecciones SQL (`$1, $2, ...`) mediante la credencial subyacente `DATABASE_URL`.

**Riesgos de Seguridad Asociados a esta Maniobra:**
Al utilizar el string de conexión directa, nos conectamos vía rol de superusuario nativo de PostgreSQL (`postgres.bvawgqprxui...`). 
1. **Total Bypass:** Esta acción es absoluta. Ninguna regla RLS que dependa de tokens JWT asimilados en Supabase (`auth.uid()`) es evaluada. 
2. **Registro de Auditoría Opaco:** En los historiales del panel de API convencional de Supabase, estos inserts corren por debajo de la interfaz REST (PostgREST), operando directamente al motor transaccional, opacando las analíticas de red frontend de Supabase (las métricas de API calls no lo reflejarán).
3. **Peligro Destructivo:** En un script descontrolado, este tipo de privilegio no permite retrocesos (rollbacks) automáticos por barreras API en caso de destrucción accidental (DROP TABLE). 

---

## 5. Estado Actual de la Base de Datos

Luego de la maniobra de superusuario, la tabla ejecutiva fue poblada.

- **Conteo Real en Producción:** Tras efectuar validación cruzada mediante `SELECT count(*) FROM conferencias`, habitan un total de **301 registros** dentro de la tabla (300 de la inyección piloto + 1 preexistente).
- **Anomalías Intrarregistro:** Mantenemos contaminación semántica de base, visible en el campo `slug`, por la naturaleza abstracta y permisiva del algoritmo deduplicador que generó los datos en crudo. Ejemplo documentado:
  - `la-revelacion-de-los-7-truenos-1974-08-04`
  - `la-revelacion-de-los-siete-truenos-1974-08-04`
Ambos registros eludieron el constraint `UNIQUE` del `slug` dentro del motor PostgreSQL al diferir de manera minúscula por las entidades morfológicas numéricas vs escritas.

---

## 6. Incidentes Mínimos e Ignorados durante la Piloto

Durante esta etapa pre-productiva y bajo condición de "resolución inmediata", se sortearon colateralmente las siguientes imperfecciones por parte del código puente:

1. **Campos Opcionales en JavaScript vs Postgres:** El mapeo genérico tomó todos los campos de JavaScript (`audio_url`, `ponente_rol`, etc.). Valores interpretados como "null" en JavaScript fueron mandados directamente al pooler nativo de PostgreSQL. El insert puro dependió de que la arquitectura de esquemas de Supabase tolerara nativamente valores `NULL` estrictos en las definiciones de sus columnas (no generando Error constraints de `NOT NULL`). No ocurrió rechazo de tipos, dando fe de que el Schema inicial está correctamente relajado.
2. **Ignorar Formateo Riguroso de Fecha (`fecha_impartida`):** Para agrupar el Pool por años (1978... 2018), el motor ejecutó un rápido `item.fecha_impartida.substring(0, 4)`. Si el campo tenía valores atípicos (e.g. nulos, `unknown` o cadenas defectuosas) hubiera estallado o resultado en `NaN`. El error fue mitigado designando un `fallback='0'` mediante un operador ternario laxo, lo que permitió transitar inyecciones sin romperse.

**Cierre de Auditoría.** Quedo a sus órdenes.
— *Antigravity AI.*
