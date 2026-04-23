import {
  AiConfigGenerationError,
  type AiFallbackReason,
} from './aiConfigGenerationError'
import type { GameConfig } from './GameConfig'
import { isValidGameConfig } from './validateGameConfig'

function classifyHttpError(status: number, message: string): AiFallbackReason {
  const m = message.toLowerCase()
  if (status === 429) return 'insufficient_allocation'
  if (status === 402) return 'insufficient_allocation'
  if (status === 503 && (m.includes('openai') || m.includes('not configured'))) {
    return 'unconfigured'
  }
  if (status === 503 && (m.includes('quota') || m.includes('rate') || m.includes('billing'))) {
    return 'insufficient_allocation'
  }
  if (status === 401 || status === 403) return 'unconfigured'
  if (status >= 500) return 'http_error'
  return 'http_error'
}

/**
 * Asks the server to turn the composed prompt into a validated `GameConfig` via the LLM.
 * Throws `AiConfigGenerationError` if the request fails or the payload is invalid (caller should fall back).
 */
export async function generateGameConfigFromAI(
  prompt: string,
  moduleHint: GameConfig | null,
): Promise<GameConfig> {
  const body: { prompt: string; moduleHint?: GameConfig } = { prompt }
  if (moduleHint) body.moduleHint = moduleHint

  let res: Response
  try {
    res = await fetch('/api/generate-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AiConfigGenerationError(
      'Network error calling /api/generate-config',
      'network',
    )
  }

  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    config?: unknown
  }

  const serverMessage = typeof data.message === 'string' ? data.message : 'AI generation failed'

  if (!res.ok) {
    const code = classifyHttpError(res.status, serverMessage)
    throw new AiConfigGenerationError(serverMessage, code, res.status)
  }

  if (!isValidGameConfig(data.config)) {
    throw new AiConfigGenerationError('Invalid config from server', 'invalid_response', res.status)
  }

  return data.config
}
