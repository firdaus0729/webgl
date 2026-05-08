import type { GameConfig } from './GameConfig'

const GAME_TYPES = [
  'platformer',
  'top_down_arena',
  'retro_shooter',
  'boxing_1v1',
] as const
const THEMES = ['cyberpunk', 'forest', 'desert', 'cartoon'] as const
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const ENEMY_TYPES = ['drones', 'aliens', 'robots'] as const
const DENSITIES = ['low', 'medium', 'high'] as const
const PLATFORM_DENSITIES = ['low', 'medium', 'high'] as const
const LEVEL_SIZES = ['small', 'medium', 'large'] as const

function isEnumValue(value: unknown, allowed: readonly string[]) {
  return typeof value === 'string' && allowed.includes(value)
}

export function isValidGameConfig(value: unknown): value is GameConfig {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>

  return (
    isEnumValue(v.gameType, GAME_TYPES) &&
    isEnumValue(v.theme, THEMES) &&
    isEnumValue(v.difficulty, DIFFICULTIES) &&
    isEnumValue(v.enemyType, ENEMY_TYPES) &&
    isEnumValue(v.enemyDensity, DENSITIES) &&
    isEnumValue(v.platformDensity, PLATFORM_DENSITIES) &&
    isEnumValue(v.levelSize, LEVEL_SIZES)
  )
}

