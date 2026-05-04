import type { GameConfig } from './GameConfig'

/** Module chip selections from the studio left rail (before tuning sliders). */
export type ModuleSelectionState = {
  gameType: string
  movement: string
  interaction: string
  behavior: string
  rules: string
  visualStyle: string
  audio: string
}

/**
 * Maps UI module strings to a baseline `GameConfig`.
 * Difficulty is filled as `medium` here; use `applyStudioTuning` for challenge slider.
 */
export function gameConfigFromModuleSelection(sel: ModuleSelectionState): GameConfig {
  const moduleToGameType = (): GameConfig['gameType'] => {
    if (sel.gameType === 'top-down arena') return 'top_down_arena'
    if (sel.gameType === 'retro shooter') return 'retro_shooter'
    return 'platformer'
  }

  const isShooter = sel.gameType === 'top-down arena' || sel.gameType === 'retro shooter'

  const theme: GameConfig['theme'] =
    sel.visualStyle === 'pixel art' || sel.visualStyle === '8-bit retro'
      ? 'cartoon'
      : sel.visualStyle === '16-bit retro'
        ? 'forest'
        : 'cyberpunk'

  const enemyType: GameConfig['enemyType'] =
    sel.behavior === 'stationary turrets'
      ? 'robots'
      : sel.behavior === 'wave spawns'
        ? 'aliens'
        : sel.behavior === 'patrol guards'
          ? 'drones'
          : 'robots'

  const enemyDensity: GameConfig['enemyDensity'] =
    sel.interaction === 'collect items'
      ? 'low'
      : sel.interaction === 'collide with enemies'
        ? 'medium'
        : sel.interaction === 'shoot enemies'
          ? 'high'
          : 'medium'

  const platformDensity: GameConfig['platformDensity'] =
    sel.movement === 'run + double jump'
      ? 'high'
      : sel.movement === 'dash + jump'
        ? 'medium'
        : sel.movement === 'run and jump'
          ? 'medium'
          : isShooter
            ? 'low'
            : 'medium'

  const levelSize: GameConfig['levelSize'] =
    sel.rules === 'score + timer'
      ? 'small'
      : sel.rules === 'survive waves'
        ? 'large'
        : 'medium'

  return {
    gameType: moduleToGameType(),
    theme,
    difficulty: 'medium',
    enemyType,
    enemyDensity,
    platformDensity,
    levelSize,
  }
}
