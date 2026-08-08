import 'server-only'

const MODEL = 'BAAI/bge-m3'
const REVISION = '142964af7e05de16511657561de8e8750fc153a0'
const DIMENSION = 1024
const MAX_TOKENS = 512
const TIMEOUT_MS = 30_000
const L2_TOLERANCE = 1e-4
const DEFAULT_ENCODER_URL = 'http://127.0.0.1:8766'

type EncoderPayload = {
  vector: number[]
  modelo: string
  revision: string
  normalizado: boolean
  tokens: number
}

export type BgeEncodedQuery = {
  vector: number[]
  tokens: number
}

export class BgeEncoderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'BgeEncoderError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function validatePayload(value: unknown): EncoderPayload {
  if (!isRecord(value)) {
    throw new BgeEncoderError('El codificador devolvio una respuesta invalida.')
  }

  const vector = value.vector
  const tokens = value.tokens

  if (
    value.modelo !== MODEL ||
    value.revision !== REVISION ||
    value.normalizado !== true ||
    !Array.isArray(vector) ||
    vector.length !== DIMENSION ||
    !vector.every((component) =>
      typeof component === 'number' && Number.isFinite(component)
    ) ||
    !Number.isInteger(tokens) ||
    (tokens as number) < 1 ||
    (tokens as number) > MAX_TOKENS
  ) {
    throw new BgeEncoderError(
      'El vector semantico no cumple el contrato certificado.'
    )
  }

  const l2Norm = Math.sqrt(
    vector.reduce((sum, component) => sum + component * component, 0)
  )

  if (!Number.isFinite(l2Norm) || Math.abs(l2Norm - 1) > L2_TOLERANCE) {
    throw new BgeEncoderError(
      'El vector semantico no conserva una norma L2 valida.'
    )
  }

  return {
    vector,
    modelo: value.modelo,
    revision: value.revision,
    normalizado: value.normalizado,
    tokens: tokens as number,
  }
}

function encoderEndpoint(): string {
  const configuredUrl = process.env.BGE_ENCODER_URL ?? DEFAULT_ENCODER_URL

  try {
    return new URL('/encode', configuredUrl).toString()
  } catch (error) {
    throw new BgeEncoderError(
      'La direccion privada del codificador BGE-M3 es invalida.',
      { cause: error }
    )
  }
}

export async function encodeBgeQuery(query: string): Promise<BgeEncodedQuery> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(encoderEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new BgeEncoderError(
        response.status === 400
          ? 'La consulta semantica fue rechazada por el codificador.'
          : 'El codificador semantico no esta disponible.'
      )
    }

    const payload: unknown = await response.json()
    const validated = validatePayload(payload)

    return {
      vector: validated.vector,
      tokens: validated.tokens,
    }
  } catch (error) {
    if (error instanceof BgeEncoderError) {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new BgeEncoderError(
        'El codificador semantico excedio el tiempo maximo de 30 segundos.',
        { cause: error }
      )
    }
    throw new BgeEncoderError(
      'No fue posible contactar el codificador semantico privado.',
      { cause: error }
    )
  } finally {
    clearTimeout(timeout)
  }
}
