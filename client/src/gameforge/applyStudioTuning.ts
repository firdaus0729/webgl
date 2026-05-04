import type {
  Difficulty,
  EnemyDensity,
  GameConfig,
  LevelSize,
  PlatformDensity,
} from './GameConfig'

/** Right-rail slider values 0–100 (studio tuning). */
export type StudioTuning = {
  /** Overall challenge — maps to `difficulty` (gravity, speed, jump tuning in builder). */
  challenge: number
  /** Enemy presence — maps to `enemyDensity`. */
  enemyPressure: number
  /** Layout complexity — maps to `platformDensity`. */
  platformRichness: number
  /** Level span — maps to `levelSize`. */
  worldScale: number
}

export const DEFAULT_STUDIO_TUNING: StudioTuning = {
  challenge: 50,
  enemyPressure: 50,
  platformRichness: 50,
  worldScale: 50,
}

function triDifficulty(n: number): Difficulty {
  if (n < 34) return 'easy'
  if (n < 67) return 'medium'
  return 'hard'
}

function triDensity(n: number): EnemyDensity | PlatformDensity {
  if (n < 34) return 'low'
  if (n < 67) return 'medium'
  return 'high'
}

function triLevelSize(n: number): LevelSize {
  if (n < 34) return 'small'
  if (n < 67) return 'medium'
  return 'large'
}

/** Overrides density / difficulty / level size from sliders; keeps genre, theme, enemy type. */
export function applyStudioTuning(base: GameConfig, tuning: StudioTuning): GameConfig {
  return {
    ...base,
    difficulty: triDifficulty(tuning.challenge),
    enemyDensity: triDensity(tuning.enemyPressure),
    platformDensity: triDensity(tuning.platformRichness),
    levelSize: triLevelSize(tuning.worldScale),
  }
}
