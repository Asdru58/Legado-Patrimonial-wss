# REFACTORIZACIÓN DEL ARCHIVO CRONOLÓGICO — INSTRUCCIÓN OPERATIVA (v2)

**Clasificación:** Orden de Ejecución  
**Fecha:** 09 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Correcciones incorporadas:** ChatGPT — Auditor de Código y DB  
**Dirigido a:** Antigravity AI — Agente de Ejecución Local

---

## DECISIONES CERRADAS

Las siguientes decisiones quedan selladas y no están abiertas a reinterpretación:

1. **La década es agrupación visual, no ruta propia.** `/archivo` muestra los años agrupados por década en la misma página. No existe una ruta `/archivo/1970s`.

2. **`/archivo` sí consulta la base de datos**, pero solo con una consulta agregada liviana (conteo por año). No trae registros completos de conferencias.

3. **El Panel 3 (conferencias por mes) usa rangos de fecha**, no `extract()`. El filtro es `WHERE fecha_impartida >= :inicio_mes AND fecha_impartida < :inicio_mes_siguiente`.

4. **`browseWithoutSearch()` se retira en cuanto las nuevas rutas estén funcionales**, no al final. No puede coexistir innecesariamente con la nueva estrategia.

---

## ESTRUCTURA DE RUTAS

```
src/app/archivo/
├── page.tsx                    # Panel 1: Años agrupados por década + Buscador
├── DecadaGrid.tsx              # Componente: grilla de años por década
├── SearchBar.tsx               # Se adapta: redirige a /archivo/busqueda
├── Pagination.tsx              # Se conserva para Panel 3 y búsqueda
├── error.tsx                   # Se conserva
├── loading.tsx                 # Se conserva
├── not-found.tsx               # Se conserva
├── busqueda/
│   └── page.tsx                # Resultados de búsqueda FTS
├── sin-fecha/
│   └── page.tsx                # 22 registros sin fecha asignada
└── [year]/
    ├── page.tsx                # Panel 2: Meses del año con conteo
    ├── MesCard.tsx             # Componente: tarjeta de mes
    ├── loading.tsx
    ├── not-found.tsx
    └── [month]/
        ├── page.tsx            # Panel 3: Conferencias del mes
        ├── loading.tsx
        └── not-found.tsx
```

---

## MAPA DE RUTAS Y CONSULTAS

| URL | Qué muestra | Tipo de consulta |
|---|---|---|
| `/archivo` | Años agrupados por década, con conteo por año. Buscador global. Enlace a "Sin fecha (22)" | Consulta agregada liviana: `GROUP BY año` |
| `/archivo/[year]` | Meses del año seleccionado, con conteo por mes | Consulta agregada: `GROUP BY mes WHERE año = X` |
| `/archivo/[year]/[month]` | Conferencias del mes, paginadas de 20 en 20 | Consulta completa con rango de fechas y `LIMIT/OFFSET` |
| `/archivo/busqueda?query=...` | Resultados FTS con ranking | RPC `buscar_conferencias` (se conserva intacta) |
| `/archivo/sin-fecha` | 22 registros parciales sin fecha | `WHERE fecha_impartida IS NULL` con `LIMIT/OFFSET` |

---

## FUNCIONES DE SERVICIO

Modificar `src/lib/services/conferences.ts`. Añadir estas funciones nuevas:

### Función 1 — Conteo por año (Panel 1)

```typescript
/**
 * Devuelve el conteo de conferencias por año.
 * Consulta agregada liviana: ~45 filas.
 * También devuelve el conteo de registros sin fecha.
 */
export async function getConferenciasPorAnio(): Promise<{
    anios: { anio: number; total: number }[];
    sinFecha: number;
}>
```

**Consulta SQL subyacente:**

```sql
-- Conteo por año
SELECT
    extract(year FROM fecha_impartida)::int AS anio,
    count(*) AS total
FROM conferencias
WHERE fecha_impartida IS NOT NULL
GROUP BY anio
ORDER BY anio;

-- Conteo sin fecha
SELECT count(*) AS total
FROM conferencias
WHERE fecha_impartida IS NULL;
```

### Función 2 — Meses con conferencias (Panel 2)

```typescript
/**
 * Devuelve los meses que tienen conferencias dentro de un año,
 * con conteo por mes.
 */
export async function getMesesConConferencias(year: number): Promise<{
    meses: { mes: number; total: number }[];
    totalAnio: number;
}>
```

**Consulta SQL subyacente:**

```sql
SELECT
    extract(month FROM fecha_impartida)::int AS mes,
    count(*) AS total
FROM conferencias
WHERE fecha_impartida >= '1974-01-01'  -- rango del año
  AND fecha_impartida < '1975-01-01'
GROUP BY mes
ORDER BY mes;
```

**Validación:** Si `year` no está entre 1974 y 2018, retornar vacío. No consultar.

### Función 3 — Conferencias de un mes (Panel 3)

```typescript
/**
 * Devuelve las conferencias de un año+mes, paginadas.
 * USA RANGOS DE FECHA, no extract().
 */
export async function getConferenciasPorMes(params: {
    year: number;
    month: number;
    page: number;
    limit: number;
}): Promise<{ data: Conferencia[]; total: number }>
```

**Consulta SQL subyacente (con rangos de fecha):**

```sql
-- Para agosto 1974:
SELECT slug, titulo, extracto, fecha_impartida, ponente_nombre,
       audio_url, audio_duracion, pdf_url, video_provider,
       video_provider_id, video_status, created_at, updated_at
FROM conferencias
WHERE fecha_impartida >= DATE '1974-08-01'
  AND fecha_impartida < DATE '1974-09-01'
ORDER BY fecha_impartida ASC, created_at ASC
LIMIT 20 OFFSET 0;
```

**Validación:** Si `year` no está entre 1974 y 2018, o `month` no está entre 1 y 12, retornar vacío.

### Función 4 — Conferencias sin fecha

```typescript
/**
 * Devuelve los registros con fecha_impartida NULL, paginados.
 */
export async function getConferenciasSinFecha(params: {
    page: number;
    limit: number;
}): Promise<{ data: Conferencia[]; total: number }>
```

**Consulta:**

```sql
SELECT ...
FROM conferencias
WHERE fecha_impartida IS NULL
ORDER BY titulo ASC
LIMIT 20 OFFSET 0;
```

### Función que se retira

- `browseWithoutSearch()` — se elimina en cuanto las rutas nuevas estén funcionales y probadas.

### Funciones que se conservan sin cambios

- `searchWithRanking()` — intacta.
- `searchArchivoConferencias()` — se conserva pero solo es consumida por `/archivo/busqueda`.
- Todas las funciones de normalización y validación.

---

## COMPONENTES

### Nuevos

| Componente | Ubicación | Propósito |
|---|---|---|
| `DecadaGrid.tsx` | `archivo/` | Muestra años agrupados por década con conteo |
| `MesCard.tsx` | `archivo/[year]/` | Tarjeta de mes con nombre y conteo |
| `Breadcrumb.tsx` | `archivo/` o `components/ui/` | Navegación de migas: Archivo > Año > Mes |

### Conservados

| Componente | Cambio |
|---|---|
| `SearchBar.tsx` | Se adapta: al enviar, redirige a `/archivo/busqueda?query=...` |
| `Pagination.tsx` | Sin cambios. Se usa en Panel 3, búsqueda y sin-fecha |
| `ConferenceCard.tsx` | Sin cambios. Se usa en Panel 3 |
| `error.tsx`, `loading.tsx`, `not-found.tsx` | Se conservan y replican en subrutas nuevas |

### Se eliminan

| Archivo | Razón |
|---|---|
| `ArchivoControls.tsx` | Filtros laterales del listado plano. Ya no aplican |
| `ArchivoPageClient.tsx` | Client Component del listado plano. Reemplazado por Server Components |

---

## QUÉ NO DEBE HACER ANTIGRAVITY

- No modificar el schema de la base de datos.
- No alterar `searchWithRanking()` ni la RPC `buscar_conferencias`.
- No agregar dependencias al proyecto.
- No tomar decisiones de diseño visual fuera del Design System (dark mode, glassmorphism, dorado #D4AF37).
- No crear rutas o componentes que no estén en este plan.

---

## SECUENCIA DE IMPLEMENTACIÓN

| Paso | Acción |
|---|---|
| 1 | Crear las 4 funciones nuevas en `conferences.ts` |
| 2 | Crear `/archivo/page.tsx` nuevo (Panel 1: DecadaGrid + SearchBar) |
| 3 | Crear `/archivo/[year]/page.tsx` (Panel 2: MesCard + Breadcrumb) |
| 4 | Crear `/archivo/[year]/[month]/page.tsx` (Panel 3: ConferenceCard + Pagination + Breadcrumb) |
| 5 | Crear `/archivo/sin-fecha/page.tsx` |
| 6 | Crear `/archivo/busqueda/page.tsx` (migrar búsqueda FTS) |
| 7 | Adaptar `SearchBar.tsx` para redirección |
| 8 | Eliminar `ArchivoControls.tsx` y `ArchivoPageClient.tsx` |
| 9 | Retirar `browseWithoutSearch()` de `conferences.ts` |
| 10 | Pruebas manuales de las 5 rutas + verificación de breadcrumbs y botón atrás |

---

## CRITERIOS DE ÉXITO

| Criterio | Cómo se verifica |
|---|---|
| `/archivo` muestra años con conteo, sin consulta plana | Inspección visual + revisión de código |
| `/archivo/1974` muestra meses con conteo | Navegación funcional |
| `/archivo/1974/08` muestra conferencias con paginación | Conteo correcto |
| `/archivo/busqueda?query=truenos` devuelve resultados FTS | Mismos resultados que antes |
| `/archivo/sin-fecha` lista los 22 parciales | Conteo = 22 |
| Breadcrumbs funcionales en niveles 2 y 3 | Inspección visual |
| Botón atrás del navegador funciona | Prueba manual |
| `browseWithoutSearch` eliminada | Revisión de código |
| No existe consulta plana masiva en ningún nivel | Revisión de código |
| Design System respetado (dark, glass, dorado) | Inspección visual |

---

## ENTREGABLES

Al concluir, Antigravity debe entregar:

1. Todos los archivos nuevos y modificados.
2. Lista de archivos eliminados.
3. Captura de las 5 rutas funcionando.
4. Confirmación de que `browseWithoutSearch()` fue retirada.

Estos entregables serán revisados por el Arquitecto y el Auditor antes de cerrar la Fase 5.3.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS

**Aprobaciones:**  
- Arquitecto (Claude): ✅  
- Auditor (ChatGPT): ✅ Aprobado con correcciones (incorporadas)  
- Administrador (Abg. Asdrúbal Lira): Pendiente
