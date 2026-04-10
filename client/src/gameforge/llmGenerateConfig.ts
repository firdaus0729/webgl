import type { GameConfig } from './GameConfig'
import { isValidGameConfig } from './validateGameConfig'

/**
 * Asks the server to turn the composed prompt into a validated `GameConfig` via the LLM.
 * Throws if the request fails or the payload is invalid (caller should fall back).
 */
export async function generateGameConfigFromAI(
  prompt: string,
  moduleHint: GameConfig | null,
): Promise<GameConfig> {
  const body: { prompt: string; moduleHint?: GameConfig } = { prompt }
  if (moduleHint) body.moduleHint = moduleHint

  const res = await fetch('/api/generate-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    config?: unknown
  }

  if (!res.ok) {
    throw new Error(
      typeof data.message === 'string' ? data.message : 'AI generation failed',
    )
  }

  if (!isValidGameConfig(data.config)) {
    throw new Error('Invalid config from server')
  }

  return data.config
}
