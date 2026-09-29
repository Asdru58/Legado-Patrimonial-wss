/**
 * Formato de números para la interfaz.
 *
 * `Intl` no sirve aquí: el Node de la máquina de desarrollo (v20.18.2) trae
 * ICU reducido, así que `(5866).toLocaleString("es-ES")` resuelve a `es-VE` y
 * devuelve «5866», sin separador. En un entorno con ICU completo devolvería
 * «5.866», de modo que el portal mostraría una cosa u otra según dónde se
 * ejecute. Esta función da el mismo resultado en todas partes.
 */
export function conSeparadorDeMiles(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
