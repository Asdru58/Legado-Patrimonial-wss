# REFACTORIZACIÓN DEL ARCHIVO CRONOLÓGICO — PLAN TÉCNICO

**Clasificación:** Plan de Implementación / Sometido a Auditoría  
**Fecha:** 09 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Estado:** Pendiente de aprobación del Auditor (ChatGPT)

---

## 1. OBJETIVO

Reemplazar el listado plano paginado actual de `/archivo` por una navegación jerárquica con rutas dinámicas (Década → Año → Mes → Conferencias), conforme a la Sección 3.1 del Master Plan. Preservar la búsqueda FTS como componente transversal independiente.

---

## 2. ARQUITECTURA DE RUTAS

### Estructura de archivos

```
src/app/archivo/
├── page.tsx                    # Panel 1: Décadas + Buscador global
├── DecadaCard.tsx              # Componente: tarjeta de década
├── [year]/
│   ├── page.tsx                # Panel 2: Meses del año seleccionado
│   ├── MesCard.tsx             # Componente: tarjeta de mes
│   └── [month]/
│       ├── page.tsx            # Panel 3: Conferencias del mes
│       ├── loading.tsx         # Skeleton de carga
│       └── not-found.tsx       # Mes/año sin conferencias
├── busqueda/
│   └── page.tsx                # Resultados de búsqueda FTS (ruta dedicada)
├── SearchBar.tsx               # Componente compartido (se conserva, se adapta)
├── Pagination.tsx              # Se conserva para Panel 3
├── error.tsx                   # Se conserva
├── loading.tsx                 # Se conserva
└── not-found.tsx               # Se conserva
```

### Mapa de rutas

| URL | Componente | Tipo | Consulta a BD |
|---|---|---|---|
| `/archivo` | Panel de décadas | Server Component | Ninguna. Las décadas se renderizan estáticamente (1970s–2010s) |
| `/archivo/1974` | Meses del año 1974 | Server Component | `SELECT DISTINCT extract(month FROM fecha_impartida), count(*) FROM conferencias WHERE extract(year FROM fecha_impartida) = 1974 GROUP BY 1` |
| `/archivo/1974/08` | Conferencias de agosto 1974 | Server Component | `SELECT ... FROM conferencias WHERE extract(year FROM fecha_impartida) = 1974 AND extract(month FROM fecha_impartida) = 8 ORDER BY fecha_impartida LIMIT 20 OFFSET n` |
| `/archivo/busqueda?query=truenos` | Resultados FTS | Server Component | RPC `buscar_conferencias` (se conserva tal cual) |

---

## 3. DISEÑO POR PANEL

### Panel 1 — Décadas (`/archivo`)

**Renderizado:** Estático. No consulta la base de datos.

Las décadas se calculan del rango conocido del catálogo (1974–2018):

```
1970s, 1980s, 1990s, 2000s, 2010s
```

Cada tarjeta de década es un enlace a `/archivo?decada=1970s` que internamente redirige o filtra los años de esa década.

**Alternativa más limpia (recomendada):** Mostrar directamente los años agrupados visualmente por década, sin un nivel intermedio de "década" que requiera clic adicional. Esto reduce un paso de navegación sin violar el Master Plan, que dice "Década → Año → Mes → Conferencias" como concepto jerárquico, no como 4 clics obligatorios.

**Implementación propuesta:** El Panel 1 muestra todas las décadas como secciones, con los años como tarjetas clicables debajo de cada sección. Cada año enlaza a `/archivo/[year]`.

Además de las décadas, este panel incluye:
- El buscador global (SearchBar) que redirige a `/archivo/busqueda?query=...`
- Un indicador del total de conferencias en el archivo

**Consulta necesaria para mostrar conteo por año:**

```sql
SELECT
    extract(year FROM fecha_impartida)::int AS anio,
    count(*) AS total
FROM conferencias
WHERE fecha_impartida IS NOT NULL
GROUP BY anio
ORDER BY anio;
```

Esta consulta es ligera: devuelve ~45 filas (un año por fila) sin traer registros completos. Los 22 registros sin fecha se manejan con una sección separada ("Sin fecha asignada") con enlace propio.

### Panel 2 — Meses de un año (`/archivo/[year]`)

**URL ejemplo:** `/archivo/1974`

**Validación:** Si `year` no es un número entre 1974 y 2018, renderizar `not-found.tsx`.

**Consulta:**

```sql
SELECT
    extract(month FROM fecha_impartida)::int AS mes,
    count(*) AS total
FROM conferencias
WHERE extract(year FROM fecha_impartida) = :year
GROUP BY mes
ORDER BY mes;
```

**Renderizado:** Tarjetas de mes (Enero, Febrero, ...) mostrando el conteo de conferencias de cada mes. Solo se muestran los meses que tienen conferencias. Cada tarjeta enlaza a `/archivo/[year]/[month]`.

**Breadcrumb:** `Archivo > 1974`

### Panel 3 — Conferencias de un mes (`/archivo/[year]/[month]`)

**URL ejemplo:** `/archivo/1974/08`

**Validación:** Si `month` no es un número entre 1 y 12, o si no hay conferencias para ese año+mes, renderizar `not-found.tsx`.

**Consulta:** Esta es la única que trae registros completos, conforme al Master Plan.

```sql
SELECT slug, titulo, extracto, fecha_impartida, ponente_nombre,
       audio_url, audio_duracion, pdf_url, video_provider,
       video_provider_id, video_status
FROM conferencias
WHERE extract(year FROM fecha_impartida) = :year
  AND extract(month FROM fecha_impartida) = :month
ORDER BY fecha_impartida ASC, created_at ASC
LIMIT 20 OFFSET :offset;
```

**Paginación:** Se conserva el componente `Pagination.tsx` para este nivel. La mayoría de meses tendrán menos de 20 conferencias, pero algunos meses pueden superar ese umbral.

**Breadcrumb:** `Archivo > 1974 > Agosto`

**Componentes reutilizados:** `ConferenceCard.tsx` para cada conferencia.

---

## 4. BÚSQUEDA FTS — RUTA DEDICADA

La búsqueda se separa de la navegación jerárquica. El `SearchBar` sigue visible en todos los niveles del archivo, pero al buscar redirige a `/archivo/busqueda?query=...`.

**`/archivo/busqueda/page.tsx`** consume la misma función `searchWithRanking()` que ya existe en `conferences.ts`. Se conservan los filtros de formato y período como query params opcionales.

Esto alinea con el dictamen del Auditor: "la búsqueda FTS como experiencia transversal, la exploración cronológica con rutas propias".

---

## 5. CAMBIOS EN LA CAPA DE SERVICIOS

El archivo `src/lib/services/conferences.ts` se modifica así:

### Funciones que se conservan
- `searchWithRanking()` — sin cambios.
- `sanitizeQuery()`, `normalizeFormat()`, `parsePeriodo()` — sin cambios.
- `searchArchivoConferencias()` — se conserva pero solo para la ruta de búsqueda.

### Funciones nuevas

```typescript
/** Panel 1: Conteo de conferencias por año */
export async function getConferenciasPorAnio(): Promise<{ anio: number; total: number }[]>

/** Panel 2: Conteo de conferencias por mes dentro de un año */
export async function getMesesConConferencias(year: number): Promise<{ mes: number; total: number }[]>

/** Panel 3: Conferencias de un año+mes, paginadas */
export async function getConferenciasPorMes(params: {
    year: number;
    month: number;
    page: number;
    limit: number;
}): Promise<{ data: Conferencia[]; total: number }>

/** Registros sin fecha asignada, paginados */
export async function getConferenciasSinFecha(params: {
    page: number;
    limit: number;
}): Promise<{ data: Conferencia[]; total: number }>
```

### Función que se retira
- `browseWithoutSearch()` — reemplazada por las tres funciones nuevas.

---

## 6. MANEJO DE REGISTROS SIN FECHA

Los 22 registros parciales (con `fecha_impartida = NULL`) no encajan en la navegación por año/mes. Se manejan con una sección especial:

- En el Panel 1, debajo de las décadas, aparece una tarjeta "Sin fecha asignada (22)" que enlaza a `/archivo/sin-fecha`.
- `/archivo/sin-fecha/page.tsx` lista estos registros con paginación.

Esto requiere una ruta adicional:

```
src/app/archivo/
└── sin-fecha/
    └── page.tsx
```

---

## 7. ARCHIVOS QUE SE ELIMINAN

| Archivo | Razón |
|---|---|
| `src/app/archivo/ArchivoControls.tsx` | Los filtros laterales (ordenar, formato, período) ya no aplican en la navegación jerárquica. El filtrado se logra por la propia estructura Década/Año/Mes |
| `src/app/archivo/ArchivoPageClient.tsx` | Client Component que manejaba el estado del listado plano. Se reemplaza por Server Components puros |
| `src/app/archivo/SidebarFilters.tsx` (en components/ui/) | Mismo motivo que ArchivoControls |

---

## 8. COMPONENTES QUE SE CONSERVAN

| Componente | Uso |
|---|---|
| `SearchBar.tsx` | Se adapta para redirigir a `/archivo/busqueda?query=...` |
| `Pagination.tsx` | Se usa en Panel 3 y en búsqueda |
| `ConferenceCard.tsx` | Se usa en Panel 3 |
| `error.tsx`, `loading.tsx`, `not-found.tsx` | Se conservan y replican en subrutas |

---

## 9. ROL DE ANTIGRAVITY

### Autorizado
- Crear nuevos archivos de rutas y componentes según este plan.
- Modificar `conferences.ts` para añadir las funciones nuevas y retirar `browseWithoutSearch`.
- Adaptar `SearchBar.tsx` para la redirección a `/archivo/busqueda`.
- Eliminar archivos marcados en la Sección 7.

### No autorizado
- Modificar el schema de la base de datos.
- Alterar la función `searchWithRanking` o la RPC `buscar_conferencias`.
- Tomar decisiones de diseño visual fuera del Design System establecido.
- Agregar dependencias al proyecto.

---

## 10. CRITERIOS DE ÉXITO

| Criterio | Verificación |
|---|---|
| `/archivo` muestra décadas/años sin consulta plana masiva | Inspección visual + verificación de que no hay SELECT sobre toda la tabla |
| `/archivo/1974` muestra meses con conteo | Navegación funcional |
| `/archivo/1974/08` muestra conferencias del mes | Conteo correcto, paginación funcional |
| `/archivo/busqueda?query=truenos` devuelve resultados FTS | Mismo comportamiento que la búsqueda actual |
| `/archivo/sin-fecha` lista los 22 registros parciales | Conteo = 22 |
| No existe consulta plana masiva en ningún nivel | Revisión de código |
| Breadcrumbs funcionales en cada nivel | Inspección visual |
| Botón "atrás" del navegador funciona correctamente | Prueba manual |
| `browseWithoutSearch` eliminada de `conferences.ts` | Revisión de código |

---

## 11. SECUENCIA DE IMPLEMENTACIÓN

1. Crear las tres funciones nuevas en `conferences.ts` + la de sin-fecha.
2. Crear `/archivo/page.tsx` nuevo (Panel 1 con décadas/años).
3. Crear `/archivo/[year]/page.tsx` (Panel 2 con meses).
4. Crear `/archivo/[year]/[month]/page.tsx` (Panel 3 con conferencias).
5. Crear `/archivo/sin-fecha/page.tsx`.
6. Crear `/archivo/busqueda/page.tsx` (migrar búsqueda FTS).
7. Adaptar `SearchBar.tsx`.
8. Eliminar archivos obsoletos.
9. Pruebas manuales de las 5 rutas.
10. Retirar `browseWithoutSearch` de `conferences.ts`.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
