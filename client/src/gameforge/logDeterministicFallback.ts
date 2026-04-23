import type { AiFallbackReason } from './aiConfigGenerationError'
import { AiConfigGenerationError } from './aiConfigGenerationError'

const REASON_LABEL: Record<AiFallbackReason, string> = {
  insufficient_allocation:
    'OpenAI quota / billing / rate limits (insufficient allocation or similar)',
  unconfigured: 'API key or server AI setup missing (not configured)',
  invalid_response: 'Model returned data that failed validation',
  http_error: 'HTTP error from the generate-config API',
  network: 'Network failure reaching the generate-config API',
  unknown: 'Unknown error',
}

/**
 * Log when we mount a game without an AI-generated `GameConfig` so developers
 * can see why deterministic / module-hint fallback ran.
 */
export function logDeterministicGameConfigFallback(err: unknown): void {
  let code: AiFallbackReason = 'unknown'
  let message = err instanceof Error ? err.message : String(err)
  let httpStatus: number | undefined

  if (err instanceof AiConfigGenerationError) {
    code = err.code
    httpStatus = err.httpStatus
  }

  const reasonLine = REASON_LABEL[code] ?? code

  console.warn(
    '[Igraverse] Alternative game pipeline active: using deterministic config (modules + prompt parsing + per-session layout seed) instead of OpenAI.',
    {
      reason: reasonLine,
      code,
      detail: message,
      ...(httpStatus !== undefined ? { httpStatus } : {}),
    },
  )
}
