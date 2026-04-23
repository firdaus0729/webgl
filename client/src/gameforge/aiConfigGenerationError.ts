/** Thrown when `/api/generate-config` cannot return a valid AI `GameConfig`. */
export class AiConfigGenerationError extends Error {
  readonly code: AiFallbackReason

  readonly httpStatus?: number

  constructor(message: string, code: AiFallbackReason, httpStatus?: number) {
    super(message)
    this.name = 'AiConfigGenerationError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

/** Why the client may fall back to deterministic config generation. */
export type AiFallbackReason =
  | 'insufficient_allocation'
  | 'unconfigured'
  | 'invalid_response'
  | 'http_error'
  | 'network'
  | 'unknown'
