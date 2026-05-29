import type {
  Difficulty,
  EnemyDensity,
  EnemyType,
  GameType,
  LevelSize,
  PlatformDensity,
  Theme,
} from './GameConfig'

/** Per-session presentation and scoring (from `sessionSeed` in the builder). */
export type SessionVisualVariant = {
  skyStarCount: number
  parallaxBack: number
  parallaxMid: number
  parallaxFront: number
  skyBackAlpha: number
  skyMidAlpha: number
  skyFrontAlpha: number
  relicScore: number
  enemyDestroyScore: number
  bulletCooldownMs: number
  bulletSpeedX: number
  shooterStarCount: number
  /** Horizontal drift as ratio of view width from center (e.g. -0.1 = left). */
  shooterPlayerXRatio: number
  arenaKillTargetMul: number
  arenaPlayerSpeedMul: number
}

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
  /** Set when built via `buildPlatformerTemplateFromConfig` (client-side procedural runs). */
  sessionSeed?: string
  sessionVariant?: SessionVisualVariant
  levelElements?: LevelElementsConfig
}

export type QuestionBlockReward = 'coin' | 'mushroom' | 'flower' | 'star' | '1up'

export type LevelPipeElement = {
  type: 'pipe'
  xRatio: number
  /** Pipe height as ratio of screen height */
  heightRatio: number
  warpToXRatio: number
}

export type LevelQuestionElement = {
  type: 'question'
  xRatio: number
  yAboveGroundRatio: number
  reward: QuestionBlockReward
}

export type LevelCheckpointElement = {
  type: 'checkpoint'
  xRatio: number
}

export type LevelElement =
  | LevelPipeElement
  | LevelQuestionElement
  | LevelCheckpointElement

export type LevelElementsConfig = {
  elements: LevelElement[]
}

// Default template config for the MVP platformer.
export const PLATFORMER_TEMPLATE_CONFIG: PlatformerTemplateConfig = {
  world: {
    widthScale: 1.7,
    gravityY: 1400,
    groundYOffsetRatio: 48 / 540,
  },
  player: {
    moveSpeed: 260,
    jumpSpeed: 540,
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
    backgroundColor: '#5c94fc',
    playerFill: 0xe52521,
    playerStroke: 0x2150d0,
    platformFill: 0x00a844,
    platformStroke: 0xc84c0c,
  },
}

