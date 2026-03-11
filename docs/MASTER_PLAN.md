# 📜 MASTER PLAN — Legado Patrimonial WSS

> **Fase 5: Expansión Institucional y Optimización de Arquitectura**
> Fecha de inicio: 5 de marzo de 2026
> Estado: En planificación

---

## 1. Visión General

El proyecto **Legado Patrimonial WSS** escala de un catálogo de pruebas a un **portal web documental de alto rendimiento**. El archivo comprende material desde **1978 hasta 2026** en formatos de **Audio, Video y PDF**, lo que exige una arquitectura optimizada para consultas masivas y una experiencia de usuario premium.

### Design System (heredado)

| Token | Valor |
|-------|-------|
| Modo | **Dark Mode** obligatorio |
| Estilo visual | **Glassmorphism** |
| Color de acento | **Dorado** (`#D4AF37` / variantes HSL) |
| Tipografía | Inter / Outfit (Google Fonts) |

---

## 2. Arquitectura de Rutas (UI/UX)

Todas las secciones son accesibles desde un **Navbar centralizado** que respeta el Design System.

| Ruta | Sección | Descripción |
|------|---------|-------------|
| `/` | **Inicio** | Buscador global, feed "Continuar escuchando", últimas publicaciones |
| `/el-legado` | **El Legado (Quiénes somos)** | Identidad institucional y propósito del archivo |
| `/archivo` | **Archivo Cronológico** | Motor principal de BD — navegación jerárquica |
| `/estudios` | **Estudios Temáticos** | Colecciones agrupadas (Ej. Las Siete Edades, Los Sellos) |
| `/alabanza` | **Alabanza y Adoración** | Hub musical conectado al reproductor persistente |
| `/podcast` | **Podcast** | Estudios semanales en formato diálogo/entrevista sobre textos proféticos (audio y video) |
| `/blog` | **Blog** | Artículos y actualizaciones |
| `/admin` | **Panel de Administración** | Acceso privado: carga (upload) y gestión de metadatos en Supabase |

---

## 3. Reglas de Rendimiento y Base de Datos (Supabase)

> [!CAUTION]
> Quedan **estrictamente prohibidas** las consultas planas masivas (`SELECT * FROM conferencias`). Todo acceso a datos debe seguir las reglas a continuación.

### 3.1 Carga Jerárquica — Archivo Cronológico

La ruta `/archivo` implementa una navegación por **paneles progresivos**:

```
Década → Año → Mes → Conferencias
```

- **Panel 1 — Décadas**: Renderizado estático (1970s, 1980s, …, 2020s). Sin consulta a BD.
- **Panel 2 — Años**: Al seleccionar una década, consulta `DISTINCT año` filtrado por rango de década.
- **Panel 3 — Meses**: Al seleccionar un año, consulta `DISTINCT mes` filtrado por año.
- **Panel 4 — Conferencias**: Al seleccionar un mes, consulta la tabla `conferencias` filtrada por año + mes. **Esta es la única consulta que trae registros completos.**

### 3.2 Paginación

- Límite estricto: **20 tarjetas por carga**.
- Implementación: Infinite Scroll o paginación estándar con numeración.
- Cada página solicita `LIMIT 20 OFFSET n` al endpoint de Supabase.

### 3.3 Búsqueda Avanzada — Full-Text Search

- El buscador global utilizará **PostgreSQL Full-Text Search** nativo de Supabase.
- Se abandona el uso de filtros `ilike` por ineficiencia a escala.
- Requiere crear una columna `fts tsvector` en la tabla `conferencias` con un `GIN index`.
- La búsqueda se invoca con `textSearch()` del SDK de Supabase.

### 3.4 Indexación de Metadatos — Citas Bíblicas (Futuro)

- El esquema de BD debe contemplar una tabla o columna para **"Citas Bíblicas Clave"**.
- Caso de uso: Buscar "Apocalipsis 10" → devuelve conferencias asociadas.
- Estructura propuesta:

```sql
-- Tabla futura
CREATE TABLE citas_biblicas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conferencia_id UUID REFERENCES conferencias(id),
  libro TEXT NOT NULL,          -- Ej: "Apocalipsis"
  capitulo INT NOT NULL,        -- Ej: 10
  versiculo_inicio INT,         -- Ej: 1
  versiculo_fin INT,            -- Ej: 7
  texto_referencia TEXT          -- Ej: "Apocalipsis 10:1-7"
);

CREATE INDEX idx_citas_libro_cap ON citas_biblicas(libro, capitulo);
```

---

## 4. Innovaciones del Reproductor Persistente

### 4.1 Memoria de Estado — "Continuar Escuchando"

El componente `PersistentPlayer` **debe obligatoriamente** usar `localStorage` para persistir:

| Clave localStorage | Valor | Descripción |
|---------------------|-------|-------------|
| `lp_current_track` | `{ conferencia_id, titulo, url_audio }` | Conferencia actualmente cargada |
| `lp_playback_position` | `number` (segundos) | Timestamp exacto donde se pausó |
| `lp_playback_updated` | `ISO 8601 string` | Fecha/hora de la última actualización |

**Comportamiento esperado:**
1. Al pausar o cerrar la pestaña → se guarda automáticamente el `currentTime` del `<audio>`.
2. Al recargar la página o volver otro día → el reproductor recupera el estado y posiciona el audio en el segundo exacto.
3. El evento `beforeunload` del navegador se usa como respaldo para guardar el estado al cerrar.

### 4.2 Historial Espiritual

El sistema registra localmente los **últimos 20 mensajes escuchados** para alimentar el feed de la vista de "Inicio".

| Clave localStorage | Valor |
|---------------------|-------|
| `lp_history` | `Array<{ conferencia_id, titulo, fecha_escucha, progreso_pct }>` |

- Máximo 20 entradas (FIFO: al llegar a 20, se elimina la más antigua).
- Se actualiza cada vez que el usuario reproduce un audio durante más de 30 segundos.

---

## 5. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS + CSS custom |
| Estado global | Zustand |
| Backend/BD | Supabase (PostgreSQL) |
| Auth (futuro) | Supabase Auth |
| Hosting (futuro) | Vercel |
| Almacenamiento media | Supabase Storage |

---

## 6. Estructura de Carpetas (Proyección)

```
src/
├── app/
│   ├── page.tsx                    # Inicio
│   ├── layout.tsx                  # Layout global + PersistentPlayer
│   ├── el-legado/
│   │   └── page.tsx
│   ├── archivo/
│   │   ├── page.tsx                # Panel de décadas
│   │   └── [year]/
│   │       └── [month]/
│   │           └── page.tsx        # Lista de conferencias
│   ├── estudios/
│   │   ├── page.tsx
│   │   └── [coleccion]/
│   │       └── page.tsx
│   ├── alabanza/
│   │   └── page.tsx
│   ├── podcast/
│   │   ├── page.tsx
│   │   └── [episodio]/
│   │       └── page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   └── admin/
│       ├── page.tsx
│       └── upload/
│           └── page.tsx
├── components/
│   ├── ui/                         # Componentes reutilizables
│   ├── player/                     # PersistentPlayer + controles
│   ├── archivo/                    # Paneles jerárquicos
│   └── layout/                     # Navbar, Footer, Sidebar
├── lib/
│   ├── supabase/                   # Clientes, queries, helpers
│   └── storage.ts                  # Helpers de localStorage
├── store/
│   └── playerStore.ts              # Zustand store
└── types/
    └── database.ts                 # Tipos de BD
```

---

## 7. Fases de Implementación

| Fase | Alcance | Estado |
|------|---------|--------|
| 5.1 | Documento Maestro (este archivo) | 🟡 En progreso |
| 5.2 | Navbar + Rutas base | ⬜ Pendiente |
| 5.3 | Archivo Cronológico (carga jerárquica) | ⬜ Pendiente |
| 5.4 | PersistentPlayer (memoria de estado + historial) | ⬜ Pendiente |
| 5.5 | Páginas de contenido (El Legado, Estudios, Alabanza, Podcast, Blog) | ⬜ Pendiente |
| 5.6 | Búsqueda Full-Text Search | ⬜ Pendiente |
| 5.7 | Panel de Administración | ⬜ Pendiente |
| 5.8 | Optimización y pruebas finales | ⬜ Pendiente |
