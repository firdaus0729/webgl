import type { GameConfig } from './GameConfig'
import type { PlatformerTemplateConfig } from './config'
import { PLATFORMER_TEMPLATE_CONFIG } from './config'
import {
  hashStringToUint32,
  mulberry32,
  rngFromString,
} from './sessionSeed'

const themeToColors: Record<
  GameConfig['theme'],
  {
    backgroundColor: string
    playerFill: number
    playerStroke: number
    platformFill: number
    platformStroke: number
  }
> = {
  cyberpunk: {
    backgroundColor: '#001b20',
    playerFill: 0x01a4f3,
    playerStroke: 0x02a955,
    platformFill: 0x02a955,
    platformStroke: 0x01a4f3,
  },
  forest: {
    backgroundColor: '#041813',
    playerFill: 0x2ef39a,
    playerStroke: 0x01a4f3,
    platformFill: 0x2a9d5a,
    platformStroke: 0x01a4f3,
  },
  desert: {
    backgroundColor: '#1a120a',
    playerFill: 0xffc857,
    playerStroke: 0x01a4f3,
    platformFill: 0x02a955,
    platformStroke: 0xffc857,
  },
  cartoon: {
    backgroundColor: '#0b1f23',
    playerFill: 0x01a4f3,
    playerStroke: 0x02a955,
    platformFill: 0x02a955,
    platformStroke: 0x01a4f3,
  },
}

function difficultyTuning(game: GameConfig) {
  switch (game.difficulty) {
    case 'easy':
      return { gravityY: 900, moveSpeed: 220, jumpSpeed: 460 }
    case 'hard':
      return { gravityY: 1500, moveSpeed: 290, jumpSpeed: 560 }
    case 'medium':
    default:
      return { gravityY: 1200, moveSpeed: 260, jumpSpeed: 520 }
  }
}

function levelSizeTuning(game: GameConfig) {
  switch (game.levelSize) {
    case 'small':
      return { widthScale: 1.2 }
    case 'large':
      return { widthScale: 2.2 }
    case 'medium':
    default:
      return { widthScale: 1.7 }
  }
}

function difficultyEnemyTuning(game: GameConfig) {
  switch (game.difficulty) {
    case 'easy':
      return { speed: 95, chaseDistance: 180 }
    case 'hard':
      return { speed: 145, chaseDistance: 260 }
    case 'medium':
    default:
      return { speed: 120, chaseDistance: 220 }
  }
}

function bridgeCountByDifficulty(game: GameConfig) {
  if (game.difficulty === 'easy') return 10
  if (game.difficulty === 'hard') return 20
  return 15
}

const PhaserMathLike = {
  clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
  },
}

function sessionPhysicsVariance(sessionSeed: string) {
  const rng = rngFromString(`${sessionSeed}|phys`)
  return {
    gravityMul: PhaserMathLike.clamp(0.93 + rng() * 0.14, 0.88, 1.06),
    moveMul: PhaserMathLike.clamp(0.94 + rng() * 0.12, 0.9, 1.08),
    jumpMul: PhaserMathLike.clamp(0.94 + rng() * 0.12, 0.9, 1.08),
    enemySpeedMul: PhaserMathLike.clamp(0.9 + rng() * 0.2, 0.85, 1.12),
    chaseDistMul: PhaserMathLike.clamp(0.92 + rng() * 0.18, 0.88, 1.1),
    cameraLerpMul: PhaserMathLike.clamp(0.85 + rng() * 0.35, 0.75, 1.25),
    spawnXJitter: (rng() - 0.5) * 0.14,
  }
}

function generateFloatingPlatforms(game: GameConfig, sessionSeed: string) {
  const seedStr = [
    game.gameType,
    game.theme,
    game.difficulty,
    game.enemyType,
    game.enemyDensity,
    game.platformDensity,
    game.levelSize,
    sessionSeed,
  ].join('|')
  const rng = mulberry32(hashStringToUint32(seedStr))

  const totalBridges = bridgeCountByDifficulty(game)
  const scaleBase =
    game.platformDensity === 'high' ? 0.92 : game.platformDensity === 'low' ? 1.02 : 0.98
  const lowY = 86 / 540
  const midY = 166 / 540
  const highY = 246 / 540

  const forms: Array<1 | 2 | 3> = []
  let placed = 0
  while (placed < totalBridges) {
    const remain = totalBridges - placed
    const next =
      remain >= 3 ? ((Math.floor(rng() * 3) + 1) as 1 | 2 | 3) : (remain as 1 | 2)
    forms.push(next)
    placed += next
  }

  const clusters = forms.length
  const platforms: Array<{ xRatio: number; yAboveGroundRatio: number; scaleX: number }> = []
  for (let i = 0; i < clusters; i++) {
    const t = clusters === 1 ? 0.5 : i / (clusters - 1)
    const centerX = PhaserMathLike.clamp(0.09 + t * 0.82 + (rng() - 0.5) * 0.02, 0.09, 0.91)
    const form = forms[i]
    const stepX = 0.055
    const noiseY = (rng() - 0.5) * (6 / 540)

    platforms.push({
      xRatio: PhaserMathLike.clamp(centerX - (form - 1) * stepX * 0.5, 0.08, 0.92),
      yAboveGroundRatio: lowY + noiseY,
      scaleX: PhaserMathLike.clamp(scaleBase + (rng() - 0.5) * 0.04, 0.88, 1.08),
    })
    if (form >= 2) {
      platforms.push({
        xRatio: PhaserMathLike.clamp(centerX + stepX * 0.2, 0.08, 0.92),
        yAboveGroundRatio: midY + noiseY,
        scaleX: PhaserMathLike.clamp(scaleBase + (rng() - 0.5) * 0.04, 0.88, 1.08),
      })
    }
    if (form === 3) {
      platforms.push({
        xRatio: PhaserMathLike.clamp(centerX + stepX * 0.9, 0.08, 0.92),
        yAboveGroundRatio: highY + noiseY,
        scaleX: PhaserMathLike.clamp(scaleBase + (rng() - 0.5) * 0.04, 0.88, 1.08),
      })
    }
  }

  platforms.sort((a, b) =>
    Math.abs(a.xRatio - b.xRatio) < 0.0001
      ? a.yAboveGroundRatio - b.yAboveGroundRatio
      : a.xRatio - b.xRatio,
  )
  return platforms.slice(0, totalBridges)
}

function generateEnemySpawns(
  game: GameConfig,
  platforms: PlatformerTemplateConfig['platforms']['floating'],
  sessionSeed: string,
) {
  const seedStr = [
    game.gameType,
    game.theme,
    game.difficulty,
    game.enemyType,
    game.enemyDensity,
    game.platformDensity,
    game.levelSize,
    sessionSeed,
    'enemies',
  ].join('|')
  const rng = mulberry32(hashStringToUint32(seedStr))

  const densityCount =
    game.enemyDensity === 'low'
      ? Math.max(1, Math.floor(platforms.length * 0.35))
      : game.enemyDensity === 'high'
        ? Math.max(1, Math.floor(platforms.length * 0.7))
        : Math.max(1, Math.floor(platforms.length * 0.5))

  const requiredMinCount = Math.ceil(platforms.length * 0.5)
  const count = Math.max(requiredMinCount, densityCount)
  const enemyTuning = difficultyEnemyTuning(game)

  const spawn: Array<{
    xRatio: number
    yAboveGroundRatio: number
    direction: 1 | -1
    bridgeIndex: number
    patrolRadiusPx?: number
  }> = []

  const enemyBridgeIndices: number[] = []
  const picked = new Set<number>()
  while (picked.size < count && picked.size < platforms.length) {
    picked.add(Math.floor(rng() * platforms.length))
  }

  picked.forEach((idx) => {
    const p = platforms[idx]
    const bridgeWidthPx = 210 * p.scaleX
    const patrolRadiusPx = bridgeWidthPx * 0.3
    enemyBridgeIndices.push(idx)
    spawn.push({
      xRatio: PhaserMathLike.clamp(p.xRatio, 0.08, 0.92),
      yAboveGroundRatio: Math.max(0, p.yAboveGroundRatio - 14 / 540),
      direction: rng() < 0.5 ? 1 : -1,
      patrolRadiusPx,
      bridgeIndex: idx,
    })
  })

  spawn.sort((a, b) => a.xRatio - b.xRatio)
  return { spawn, enemyTuning, enemyBridgeIndices }
}

export function buildPlatformerTemplateFromConfig(
  game: GameConfig,
  sessionSeed: string,
): PlatformerTemplateConfig {
  const colors = themeToColors[game.theme]
  const diff = difficultyTuning(game)
  const size = levelSizeTuning(game)
  const phys = sessionPhysicsVariance(sessionSeed)

  const base = PLATFORMER_TEMPLATE_CONFIG

  const floating = generateFloatingPlatforms(game, sessionSeed)
  const enemyGenerated = generateEnemySpawns(game, floating, sessionSeed)
  const floatingWithEnemyAdjust = floating.map((p, idx) => {
    if (!enemyGenerated.enemyBridgeIndices.includes(idx)) return p
    return {
      ...p,
      scaleX: PhaserMathLike.clamp(p.scaleX + 0.14, 0.9, 1.24),
    }
  })

  const gravityY = PhaserMathLike.clamp(diff.gravityY * phys.gravityMul, 780, 1680)
  const moveSpeed = PhaserMathLike.clamp(diff.moveSpeed * phys.moveMul, 195, 315)
  const jumpSpeed = PhaserMathLike.clamp(diff.jumpSpeed * phys.jumpMul, 405, 595)
  const enemySpeed = PhaserMathLike.clamp(
    enemyGenerated.enemyTuning.speed * phys.enemySpeedMul,
    78,
    168,
  )
  const chaseDistance = PhaserMathLike.clamp(
    enemyGenerated.enemyTuning.chaseDistance * phys.chaseDistMul,
    155,
    295,
  )
  const spawnXRatio = PhaserMathLike.clamp(
    base.player.spawnXRatio + phys.spawnXJitter,
    0.12,
    0.38,
  )
  const followLerp = PhaserMathLike.clamp(
    base.camera.followLerp * phys.cameraLerpMul,
    0.045,
    0.2,
  )

  return {
    ...base,
    world: {
      ...base.world,
      widthScale: size.widthScale,
      gravityY,
    },
    player: {
      ...base.player,
      moveSpeed,
      jumpSpeed,
      spawnXRatio,
    },
    platforms: {
      ...base.platforms,
      floating: floatingWithEnemyAdjust,
    },
    enemies: {
      ...base.enemies,
      enemyType: game.enemyType,
      speed: enemySpeed,
      chaseDistance,
      spawn: enemyGenerated.spawn,
    },
    meta: {
      ...base.meta,
      gameType: game.gameType,
      theme: game.theme,
      difficulty: game.difficulty,
      enemyType: game.enemyType,
      enemyDensity: game.enemyDensity,
      platformDensity: game.platformDensity,
      levelSize: game.levelSize,
    },
    camera: {
      ...base.camera,
      followLerp,
    },
    theme: {
      ...base.theme,
      backgroundColor: colors.backgroundColor,
      playerFill: colors.playerFill,
      playerStroke: colors.playerStroke,
      platformFill: colors.platformFill,
      platformStroke: colors.platformStroke,
    },
  }
}
