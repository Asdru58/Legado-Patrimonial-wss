import Link from 'next/link'

export function MesaNoDisponible() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-3xl font-light text-white">Mesa de estudio temporalmente no disponible</h1>
      <p className="mt-4 text-sm text-white/70">
        Puedes seguir consultando el archivo. La opción de guardar búsquedas se
        habilitará cuando termine la preparación de la Mesa.
      </p>
      <Link href="/archivo/busqueda" className="mt-6 inline-block underline text-amber-300">
        Volver al buscador
      </Link>
    </div>
  )
}
