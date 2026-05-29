import type { GameConfig } from './GameConfig'
import type { PlatformerTemplateConfig, SessionVisualVariant } from './config'
import { PLATFORMER_TEMPLATE_CONFIG } from './config'
import {
  floatBetween,
  hashStringToUint32,
  intBetween,
  mulberry32,
  rngFromString,
} from './sessionSeed'
import { generateLevelElements } from './buildLevelElements'

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
  cartoon: {
    backgroundColor: '#5c94fc',
    playerFill: 0xe52521,
    playerStroke: 0x2150d0,
    platformFill: 0x00a844,
    platformStroke: 0xc84c0c,
  },
  forest: {
    backgroundColor: '#4488cc',
    playerFill: 0x208030,
    playerStroke: 0x603818,
    platformFill: 0x38a048,
    platformStroke: 0x7a5030,
  },
  desert: {
    backgroundColor: '#f8a848',
    playerFill: 0xe85020,
    playerStroke: 0x3060c0,
    platformFill: 0xd0a050,
    platformStroke: 0xd87830,
  },
  cyberpunk: {
    backgroundColor: '#180828',
    playerFill: 0xff2080,
    playerStroke: 0x2080ff,
    platformFill: 0x303878,
    platformStroke: 0x503060,
  },
}

function difficultyTuning(game: GameConfig) {
  switch (game.difficulty) {
    case 'easy':
      return { gravityY: 1100, moveSpeed: 240, jumpSpeed: 500 }
    case 'hard':
      return { gravityY: 1650, moveSpeed: 280, jumpSpeed: 580 }
    case 'medium':
    default:
      return { gravityY: 1400, moveSpeed: 260, jumpSpeed: 540 }
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
    gravityMul: PhaserMathLike.clamp(0.78 + rng() * 0.34, 0.72, 1.18),
    moveMul: PhaserMathLike.clamp(0.78 + rng() * 0.32, 0.72, 1.2),
    jumpMul: PhaserMathLike.clamp(0.78 + rng() * 0.32, 0.72, 1.2),
    enemySpeedMul: PhaserMathLike.clamp(0.75 + rng() * 0.4, 0.68, 1.25),
    chaseDistMul: PhaserMathLike.clamp(0.78 + rng() * 0.32, 0.7, 1.2),
    cameraLerpMul: PhaserMathLike.clamp(0.62 + rng() * 0.65, 0.48, 1.55),
    spawnXJitter: (rng() - 0.5) * 0.24,
  }
}

function bridgeCountWithSession(game: GameConfig, sessionSeed: string): number {
  const base = bridgeCountByDifficulty(game)
  const delta = intBetween(rngFromString(`${sessionSeed}|bridgeN`), -2, 5)
  return PhaserMathLike.clamp(base + delta, 8, 28)
}

function buildSessionVisualVariant(sessionSeed: string): SessionVisualVariant {
  const b = (k: string) => rngFromString(`${sessionSeed}|sv|${k}`)
  return {
    skyStarCount: intBetween(b('stars'), 65, 220),
    parallaxBack: floatBetween(b('pb'), 0.032, 0.1),
    parallaxMid: floatBetween(b('pm'), 0.075, 0.175),
    parallaxFront: floatBetween(b('pf'), 0.12, 0.3),
    skyBackAlpha: floatBetween(b('ab'), 0.3, 0.62),
    skyMidAlpha: floatBetween(b('am'), 0.12, 0.36),
    skyFrontAlpha: floatBetween(b('af'), 0.06, 0.24),
    relicScore: intBetween(b('rel'), 80, 165),
    enemyDestroyScore: intBetween(b('kill'), 130, 245),
    bulletCooldownMs: intBetween(b('bcd'), 118, 228),
    bulletSpeedX: intBetween(b('bv'), 500, 780),
    shooterStarCount: intBetween(b('sst'), 72, 175),
    shooterPlayerXRatio: floatBetween(b('spx'), -0.16, 0.16),
    arenaKillTargetMul: floatBetween(b('akt'), 0.78, 1.22),
    arenaPlayerSpeedMul: floatBetween(b('aps'), 0.84, 1.18),
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

  const totalBridges = bridgeCountWithSession(game, sessionSeed)
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
    const centerX = PhaserMathLike.clamp(0.09 + t * 0.82 + (rng() - 0.5) * 0.055, 0.08, 0.92)
    const form = forms[i]
    const stepX = 0.055
    const noiseY = (rng() - 0.5) * (14 / 540)

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
  const sliced = platforms.slice(0, totalBridges)
  return sliced.map((p, idx) => {
    const rx = rngFromString(`${sessionSeed}|platx|${idx}`)
    const ry = rngFromString(`${sessionSeed}|platy|${idx}`)
    const rs = rngFromString(`${sessionSeed}|plats|${idx}`)
    return {
      ...p,
      xRatio: PhaserMathLike.clamp(p.xRatio + (rx() - 0.5) * 0.1, 0.05, 0.95),
      yAboveGroundRatio: PhaserMathLike.clamp(
        p.yAboveGroundRatio + (ry() - 0.5) * (22 / 540),
        0.04,
        0.48,
      ),
      scaleX: PhaserMathLike.clamp(p.scaleX + (rs() - 0.5) * 0.18, 0.68, 1.32),
    }
  })
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

  const gravityY = PhaserMathLike.clamp(diff.gravityY * phys.gravityMul, 720, 1750)
  const moveSpeed = PhaserMathLike.clamp(diff.moveSpeed * phys.moveMul, 175, 335)
  const jumpSpeed = PhaserMathLike.clamp(diff.jumpSpeed * phys.jumpMul, 380, 620)
  const enemySpeed = PhaserMathLike.clamp(
    enemyGenerated.enemyTuning.speed * phys.enemySpeedMul,
    68,
    178,
  )
  const chaseDistance = PhaserMathLike.clamp(
    enemyGenerated.enemyTuning.chaseDistance * phys.chaseDistMul,
    140,
    310,
  )
  const spawnXRatio = PhaserMathLike.clamp(
    base.player.spawnXRatio + phys.spawnXJitter,
    0.1,
    0.42,
  )
  const followLerp = PhaserMathLike.clamp(
    base.camera.followLerp * phys.cameraLerpMul,
    0.04,
    0.22,
  )

  const widthScale = PhaserMathLike.clamp(
    size.widthScale * floatBetween(rngFromString(`${sessionSeed}|wsc`), 0.88, 1.18),
    1.02,
    2.65,
  )
  const groundYOffsetRatio = PhaserMathLike.clamp(
    base.world.groundYOffsetRatio *
      floatBetween(rngFromString(`${sessionSeed}|gnd`), 0.86, 1.14),
    0.056,
    0.115,
  )
  const playerScale = PhaserMathLike.clamp(
    base.player.scale * floatBetween(rngFromString(`${sessionSeed}|psc`), 0.82, 1.15),
    0.74,
    1.12,
  )
  const spawnBottomOffsetRatio = PhaserMathLike.clamp(
    base.player.spawnBottomOffsetRatio *
      floatBetween(rngFromString(`${sessionSeed}|spb`), 0.88, 1.12),
    0.22,
    0.34,
  )

  const sessionVariant = buildSessionVisualVariant(sessionSeed)
  const levelElements = generateLevelElements(game, sessionSeed)

  return {
    ...base,
    sessionSeed,
    sessionVariant,
    levelElements,
    world: {
      ...base.world,
      widthScale,
      gravityY,
      groundYOffsetRatio,
    },
    player: {
      ...base.player,
      moveSpeed,
      jumpSpeed,
      spawnXRatio,
      scale: playerScale,
      spawnBottomOffsetRatio,
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
