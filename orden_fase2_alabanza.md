# ORDEN CONSOLIDADA — FASE 2 DESMANTELAMIENTO ALABANZA

**Proyecto:** Legado Patrimonial WSS  
**Fecha:** 22 de abril de 2026  
**Emitida por:** Claude — Arquitecto de Software  
**Aprobada por:** ChatGPT — Auditor  
**Administrador:** Abg. Asdrúbal Lira  
**Dirigida a:** Antigravity — Agente de Ejecución Local  
**Autorización:** ✅ Fase 2 — Eliminación controlada (autorizada)

---

## CONTEXTO

El inventario de Fase 1 fue auditado y aprobado. Se identificaron:
- 1 archivo dentro de `src/app/alabanza/`
- 5 archivos externos con referencias activas
- 30 líneas totales con menciones
- 0 imports desde otros módulos
- 0 referencias en sitemap o config

Proceder con las siguientes 7 acciones en orden estricto.

---

## ACCIÓN 1 — Eliminar la carpeta del módulo

```powershell
Remove-Item -Recurse -Force "src/app/alabanza"
```

Elimina `src/app/alabanza/page.tsx` y la carpeta contenedora. Esto descarta automáticamente las 19 referencias internas + 2 de metadata clasificadas como 🔵 Ruta del módulo y 🟣 Metadata.

---

## ACCIÓN 2 — Remover Alabanza del Navbar

**Archivo:** `src/components/layout/Navbar.tsx`  
**Líneas:** 53-62 (aproximadas)

Eliminar el objeto completo del item Alabanza del array `navLinks`:

```typescript
// ELIMINAR (conservar los demás items intactos):
{
  label: "Alabanza",
  href: "/alabanza",
  // ... icono y demás propiedades del item
}
```

**Restricción:** No tocar los demás items (Inicio, El Legado, Archivo, Estudios, Podcast).

---

## ACCIÓN 3 — Eliminar card de Alabanza del DashboardGrid

**Archivo:** `src/components/ui/DashboardGrid.tsx`  
**Líneas:** 66-78 (aproximadas)

Eliminar el objeto completo de la card `"Alabanza y Adoración"` del array `categories`:

```typescript
// ELIMINAR (conservar las demás cards intactas):
{
  title: "Alabanza y Adoración",
  description: "Himnos y cánticos espirituales del legado patrimonial.",
  href: "/alabanza",
  cta: "Escuchar Himnos",
  // ... icono y demás propiedades
}
```

**Resultado esperado:** El grid pasa de 6 a 5 cards. Layout válido. No reemplazar con contenido nuevo.

---

## ACCIÓN 4 — Limpiar CTA y huérfano textual en Estudios

**Archivo:** `src/app/estudios/page.tsx`

**Acción 4A — Eliminar el CTA primario "Ir a Alabanza"** (líneas 391-396):

```tsx
// ELIMINAR completo:
<Link
  href="/alabanza"
  className="..."
>
  Ir a Alabanza
  <ArrowRight className="h-4 w-4" />
</Link>
```

Si tras la eliminación el bloque contenedor queda visualmente "cojo" (por ejemplo, flex con un solo elemento o layout roto), **reporta** antes de decidir ajustes compositivos. No rediseñar sin autorización.

**Acción 4B — Reformular el huérfano textual** (línea 385 aproximadamente):

Texto actual:
> *"...puede continuar con Alabanza como hub..."*

Reformulación autorizada: eliminar la mención a Alabanza y ajustar la oración para que apunte a continuidad doctrinal/archivística sin introducir conceptos nuevos.

**Directriz del Auditor:** Reescritura mínima y conservadora. Sin agregar contenido temático nuevo. No detener Fase 2 por esta reescritura — procede con redacción sobria que mantenga el tono editorial existente.

Sugerencia de redacción (Antigravity puede ajustar si hay variantes mejores):
> *"...puede continuar hacia el archivo patrimonial o el hub editorial..."*  

o

> *"...puede continuar su recorrido doctrinal por el archivo y las demás secciones editoriales..."*

---

## ACCIÓN 5 — Limpiar huérfano textual en Blog

**Archivo:** `src/app/blog/page.tsx`  
**Línea:** 413 (aproximada)

Texto actual:
> *"...entre conferencias, estudios, alabanza, podcast y lectura editorial."*

Reformulación:
> *"...entre conferencias, estudios, podcast y lectura editorial."*

**Acción:** Eliminar únicamente la palabra `"alabanza,"` (con la coma que le sigue). No tocar el resto del párrafo.

---

## ACCIÓN 6 — Limpiar huérfano textual + CTA en Podcast

**Archivo:** `src/app/podcast/page.tsx`

**Acción 6A — Limpiar huérfano textual** (línea 100 aproximadamente):

Texto actual:
> *"...conferencia, estudio, alabanza y podcast convergen..."*

Reformulación:
> *"...conferencia, estudio y podcast convergen..."*

**Acción:** Eliminar únicamente las palabras `"alabanza y"`. No tocar el resto.

**Acción 6B — Redirigir CTA secundario "Volver a Alabanza"** (líneas 193-198):

Texto y destino actual:
```tsx
<Link href="/alabanza" className="...">
  Volver a Alabanza
</Link>
```

Redirección autorizada:
```tsx
<Link href="/archivo" className="...">
  Ir al Archivo
</Link>
```

**Justificación:** El CTA secundario es estructural del hero (acompaña al primario). Eliminarlo romperia la composición. El Auditor autoriza redirección a `/archivo` (no a `/el-legado`) por coherencia funcional: el proyecto se enfoca en consumo de contenido documental.

**Conservar:** Las clases CSS, el estilo outline, el ícono si existe. Solo cambia el `href` y el texto del botón.

---

## ACCIÓN 7 — Ejecutar Fase 3 de Verificación

Tras completar las acciones 1-6, ejecutar:

**V1 — Build limpio:**
```powershell
npm run build
```
Debe completar con exit code 0.

**V2 — Verificación de referencias residuales:**

Ejecutar búsquedas case-insensitive en todo `src/`:
- `grep -ri "alabanza" src/`
- `grep -ri "Alabanza" src/`
- `grep -ri "ALABANZA" src/`

Resultado esperado: **0 coincidencias** en todo `src/`.

**V3 — Rutas en el build:**

Verificar que `/alabanza` **NO aparece** en el output del build.

Verificar que SÍ aparecen:
- `/` (home)
- `/archivo` y subrutas
- `/blog` y subrutas
- `/estudios` y subrutas
- `/podcast`
- `/el-legado`
- `/admin/*`
- `/login`
- `/conferencia/[slug]`

**V4 — Navegación estable:**

Opcional pero recomendado: levantar `npm run dev` y confirmar visualmente que:
- Navbar muestra todos los items excepto Alabanza.
- No hay enlaces rotos visibles.

---

## ENTREGABLE FINAL

Antigravity entrega informe consolidado con:

1. Confirmación de eliminación de `src/app/alabanza/`.
2. Diff de cada archivo modificado (Navbar, DashboardGrid, Estudios, Blog, Podcast).
3. Redacción final del huérfano reformulado en Estudios.
4. Resultado de `npm run build` (exit code y rutas).
5. Resultado de las 3 búsquedas de verificación V2 (debe ser 0 en todas).
6. Cualquier incidencia o composición rota detectada durante la ejecución.
7. Declaración formal: "Fase 2 completada. Módulo Alabanza descopeado del proyecto."

---

## RESTRICCIONES REITERADAS

- **NO** tocar base de datos, credenciales ni configuración de Supabase.
- **NO** rediseñar portadas. Solo cirugía de extracción y redirección autorizada.
- **NO** agregar dependencias nuevas.
- **NO** modificar la lógica de Archivo, Blog, Estudios (más allá del CTA y huérfano), Podcast (más allá del CTA y huérfano), Conferencias, PersistentPlayer, ni ningún otro módulo activo.
- **NO** reinterpretar el alcance. Si hay ambigüedad o algo no encaja con la instrucción, reporta y espera.

---

**Aprobaciones:**

- Arquitecto (Claude): ✅ Autorizado
- Auditor (ChatGPT): ✅ Autorizado con precisión sobre reescritura de Estudios
- Administrador (Abg. Asdrúbal Lira): ✅ Directriz formal de descope emitida

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS
