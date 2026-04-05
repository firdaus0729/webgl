import type {
  Difficulty,
  EnemyDensity,
  EnemyType,
  GameType,
  LevelSize,
  PlatformDensity,
  Theme,
} from './GameConfig'

export type PlatformerTemplateConfig = {
  world: {
    widthScale: number
    gravityY: number
    // Distance from bottom (as a ratio of world height) where the ground sits.
    groundYOffsetRatio: number
  }
  player: {
    moveSpeed: number
    jumpSpeed: number
    // Spawn positions are relative to the visible scene size.
    spawnXRatio: number
    spawnBottomOffsetRatio: number
    scale: number
  }
  platforms: {
    // Ground scale is derived from worldWidth / 200, then clamped.
    groundScaleXMin: number
    groundScaleXMax: number
    floating: Array<{
      xRatio: number
      // Distance above ground (as a ratio of world height).
      yAboveGroundRatio: number
      scaleX: number
    }>
  }
  enemies: {
    enemyType: EnemyType
    speed: number
    chaseDistance: number
    spawn: Array<{
      xRatio: number
      yAboveGroundRatio: number
      direction: 1 | -1
      bridgeIndex: number
      // Optional (legacy). Actual movement constraints are derived from bridge bounds.
      patrolRadiusPx?: number
    }>
  }
  meta: {
    gameType: GameType
    theme: Theme
    difficulty: Difficulty
    enemyType: EnemyType
    enemyDensity: EnemyDensity
    platformDensity: PlatformDensity
    levelSize: LevelSize
  }
  camera: {
    followLerp: number
  }
  theme: {
    backgroundColor: string
    playerFill: number
    playerStroke: number
    platformFill: number
    platformStroke: number
  }
}

// Default template config for the MVP platformer.
export const PLATFORMER_TEMPLATE_CONFIG: PlatformerTemplateConfig = {
  world: {
    widthScale: 1.7,
    gravityY: 1200,
    groundYOffsetRatio: 54 / 540,
  },
  player: {
    moveSpeed: 260,
    jumpSpeed: 520,
    spawnXRatio: 0.22,
    spawnBottomOffsetRatio: 160 / 540,
    scale: 0.95,
  },
  platforms: {
    groundScaleXMin: 1,
    groundScaleXMax: 10,
    floating: [
      { xRatio: 0.22, yAboveGroundRatio: 140 / 540, scaleX: 0.85 },
      { xRatio: 0.43, yAboveGroundRatio: 220 / 540, scaleX: 0.7 },
      { xRatio: 0.6, yAboveGroundRatio: 120 / 540, scaleX: 0.9 },
      { xRatio: 0.78, yAboveGroundRatio: 260 / 540, scaleX: 0.65 },
      { xRatio: 0.9, yAboveGroundRatio: 160 / 540, scaleX: 0.8 },
    ],
  },
  enemies: {
    enemyType: 'drones',
    speed: 170,
    chaseDistance: 380,
    spawn: [
      { xRatio: 0.42, yAboveGroundRatio: 0.0, direction: 1, bridgeIndex: 0, patrolRadiusPx: 72 },
      { xRatio: 0.62, yAboveGroundRatio: 0.0, direction: -1, bridgeIndex: 1, patrolRadiusPx: 72 },
      { xRatio: 0.78, yAboveGroundRatio: 160 / 540, direction: -1, bridgeIndex: 2, patrolRadiusPx: 72 },
      { xRatio: 0.86, yAboveGroundRatio: 220 / 540, direction: 1, bridgeIndex: 3, patrolRadiusPx: 72 },
    ],
  },
  meta: {
    gameType: 'platformer',
    theme: 'cartoon',
    difficulty: 'medium',
    enemyType: 'drones',
    enemyDensity: 'medium',
    platformDensity: 'medium',
    levelSize: 'medium',
  },
  camera: {
    followLerp: 0.08,
  },
  theme: {
    backgroundColor: '#001b20',
    playerFill: 0x01a4f3,
    playerStroke: 0x02a955,
    platformFill: 0x02a955,
    platformStroke: 0x01a4f3,
  },
}

