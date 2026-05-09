# INSTRUCCIÓN OPERATIVA — FASE R-4: REFACTORIZACIÓN DEL PIPELINE

**Clasificación:** Orden de Ejecución  
**Fecha:** 07 de abril de 2026  
**Emitido por:** Claude — Arquitecto de Software  
**Dirigido a:** Antigravity AI — Agente de Ejecución Local

---

## REINCORPORACIÓN

Quedas reincorporado al proyecto para la Fase R-4, bajo confinamiento local estricto. Esta autorización fue aprobada por el Arquitecto, el Auditor y el Administrador.

---

## QUÉ DEBES HACER

Refactorizar el script `preparar_catalogo.mjs` para que procese `catalogo_maestro_dryrun.json` y produzca una salida limpia, validada y clasificada.

El script debe ejecutar 5 etapas en secuencia:

### Etapa 1 — Carga
- Leer `catalogo_maestro_dryrun.json` completo.
- Registrar el conteo total de registros de entrada.

### Etapa 2 — Normalización de slugs
- Tokenizar cada slug por guión (`-`).
- Reemplazar palabras numéricas escritas por su cifra, usando **exactamente** este mapeo cerrado:

```
uno→1, dos→2, tres→3, cuatro→4, cinco→5, seis→6, siete→7,
ocho→8, nueve→9, diez→10, once→11, doce→12, trece→13,
catorce→14, quince→15, dieciseis→16, diecisiete→17,
dieciocho→18, diecinueve→19, veinte→20
```

- Aplicar un diccionario cerrado de equivalencias editoriales conocidas del catálogo. **Solo** estas entradas (no agregar más sin autorización):

```
cel → celestial
mobil → (eliminar sufijo, usar solo el slug base sin él)
book → (eliminar sufijo, usar solo el slug base sin él)
otro → (eliminar sufijo, usar solo el slug base sin él)
```

- Tras normalizar, verificar colisiones: si dos registros producen el mismo slug normalizado, marcar el segundo (por orden de aparición en el JSON) como duplicado.

### Etapa 3 — Parser de fechas
- Manejar estos formatos de entrada:
  - ISO estándar: `YYYY-MM-DD` → pasa directo.
  - Mes en texto: `"19 Marzo 1978"` → `1978-03-19`.
  - Formato corto con año de 2 dígitos: `"21-05-78"` → `1978-05-21`.
  - Mes abreviado: `"Nov"`, `"Dic"`, etc. → conversión al número.
- Diccionario de meses en español:

```
enero→01, febrero→02, marzo→03, abril→04, mayo→05, junio→06,
julio→07, agosto→08, septiembre→09, octubre→10, noviembre→11, diciembre→12
```

- Abreviaturas aceptadas:

```
ene→01, feb→02, mar→03, abr→04, may→05, jun→06,
jul→07, ago→08, sep→09, oct→10, nov→11, dic→12
```

- Validar rango: la fecha resultante debe caer entre `1974-01-01` y `2018-12-31`.
- Si la fecha no es parseable → asignar `null`.
- Si la fecha cae fuera de rango → asignar `null` y registrar motivo.

### Etapa 4 — Clasificación
Cada registro se clasifica en una de tres categorías:

| Categoría | Criterio | Destino |
|---|---|---|
| **Completo** | `titulo` presente + slug normalizado único + `fecha_impartida` válida en rango | `catalogo_limpio.json` |
| **Parcial** | `titulo` presente + slug único + `fecha_impartida` es `null` | `catalogo_limpio.json` (con flag `"fecha_status": "missing"`) |
| **Defectuoso** | Slug duplicado, título faltante, o fecha fuera de rango | `catalogo_cuarentena.json` |

Cada registro defectuoso debe incluir un campo `"motivo_exclusion"` con uno de estos valores:
- `"slug_duplicado"`
- `"titulo_faltante"`
- `"fecha_no_parseable"`
- `"fecha_fuera_de_rango"`

### Etapa 5 — Limpieza y salida
- Eliminar nodos temporales: `_meta`, `serie_id`, `tematica_ids`.
- Asegurar que `video_provider` y `video_status` estén presentes. Si faltan, asignar `"none"` y `"pending"` respectivamente.
- Generar tres archivos:
  1. `catalogo_limpio.json` — Registros completos + parciales.
  2. `catalogo_cuarentena.json` — Registros defectuosos con motivo.
  3. `reporte_r4.txt` — Reporte de resumen.

### Formato del reporte (`reporte_r4.txt`)

```
REPORTE R-4 — PIPELINE DE PREPARACIÓN
======================================
Total registros de entrada:        [N]
Total registros limpios:           [N]
  - Completos (con fecha):         [N]
  - Parciales (sin fecha):         [N]
Total registros en cuarentena:     [N]
  - Por slug duplicado:            [N]
  - Por título faltante:           [N]
  - Por fecha no parseable:        [N]
  - Por fecha fuera de rango:      [N]
Colisiones de slug detectadas:     [N]
======================================
```

---

## QUÉ NO DEBES HACER

- **No acceder a Supabase** de ninguna forma: ni `DATABASE_URL`, ni `SERVICE_ROLE_KEY`, ni SQL Editor, ni SDK.
- **No ejecutar** INSERT, UPDATE, DELETE ni ninguna operación de base de datos.
- **No modificar** el schema ni ningún archivo que no sea `preparar_catalogo.mjs`.
- **No ampliar** el diccionario de equivalencias numéricas ni editoriales sin autorización.
- **No interpretar** criterios de clasificación más allá de lo definido en este documento.
- **No agregar** funcionalidades, optimizaciones o "mejoras" que no estén especificadas aquí.

---

## ENTREGABLES

Al concluir, entregar estos 4 archivos:

1. `preparar_catalogo.mjs` — Script refactorizado.
2. `catalogo_limpio.json` — Registros aptos para carga.
3. `catalogo_cuarentena.json` — Registros excluidos con motivo.
4. `reporte_r4.txt` — Reporte de resumen.

Estos archivos serán revisados por el Arquitecto y el Auditor antes de proceder a R-5.

---

## FORMATO DE ENTREGA

Entregar los 4 archivos y el reporte. Sin interpretación. Sin diagnóstico. Sin recomendaciones sobre fases siguientes. Sin veredictos.

---

**Claude**  
Arquitecto de Software — Proyecto Legado Patrimonial WSS

**Aprobaciones que respaldan esta instrucción:**  
- Arquitecto (Claude): ✅  
- Auditor (ChatGPT): ✅ Aprobado condicionalmente  
- Administrador (Abg. Asdrúbal Lira): ✅
