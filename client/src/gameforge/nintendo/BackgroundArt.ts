import Phaser from 'phaser'

import type { PlatformerTemplateConfig } from '../config'
import { getNintendoPalette } from './NintendoPalette'
import { createNintendoTextures, getSkyBottomColor, getSkyGradientColor } from './SpriteFactory'
import { intBetween, rngFromString } from '../sessionSeed'

export type BackgroundLayers = {
  skyGradient: Phaser.GameObjects.Graphics
  clouds: Phaser.GameObjects.Group
  hills: Phaser.GameObjects.Graphics[]
  scrollFactors: number[]
}

export function createNintendoBackground(
  scene: Phaser.Scene,
  template: PlatformerTemplateConfig,
  worldWidth: number,
  h: number,
): BackgroundLayers {
  const theme = template.meta.theme
  const pal = getNintendoPalette(theme)
  const texKeys = createNintendoTextures(scene, theme, template.enemies.enemyType)
  const seed = template.sessionSeed ?? 'default'

  const skyGradient = scene.add.graphics().setDepth(-10)
  skyGradient.fillGradientStyle(
    pal.skyTop,
    pal.skyTop,
    pal.skyBottom,
    pal.skyBottom,
    1,
  )
  skyGradient.fillRect(0, 0, worldWidth, h)
  skyGradient.setScrollFactor(0)

  const clouds = scene.add.group()
  const cloudCount = intBetween(rngFromString(`${seed}|clouds`), 6, 14)
  for (let i = 0; i < cloudCount; i++) {
    const rng = rngFromString(`${seed}|cloud|${i}`)
    const cx = intBetween(rng, 0, worldWidth)
    const cy = intBetween(rng, 40, Math.floor(h * 0.35))
    const scale = 0.6 + rng() * 0.8
    const cloud = scene.add
      .image(cx, cy, texKeys.cloud)
      .setAlpha(0.75 + rng() * 0.25)
      .setScale(scale)
      .setDepth(-8)
      .setScrollFactor(0.15 + rng() * 0.1, 0)
    clouds.add(cloud)
  }

  const hills: Phaser.GameObjects.Graphics[] = []
  const hillConfigs = [
    { color: pal.hillFar, height: 0.42, scroll: 0.08, alpha: 0.85 },
    { color: pal.hillNear, height: 0.52, scroll: 0.18, alpha: 0.95 },
  ]

  for (let layer = 0; layer < hillConfigs.length; layer++) {
    const cfg = hillConfigs[layer]
    const hill = scene.add.graphics().setDepth(-6 + layer)
    hill.fillStyle(cfg.color, cfg.alpha)
    hill.beginPath()
    hill.moveTo(0, h)
    const peaks = Math.ceil(worldWidth / 80)
    for (let i = 0; i <= peaks; i++) {
      const x = (i / peaks) * worldWidth
      const rng = rngFromString(`${seed}|hill|${layer}|${i}`)
      const bump = Math.sin(i * (1.1 + layer * 0.3)) * (30 + layer * 15)
      const y = h * cfg.height + bump + (rng() - 0.5) * 20
      hill.lineTo(x, y)
    }
    hill.lineTo(worldWidth, h)
    hill.closePath()
    hill.fillPath()
    hill.setScrollFactor(cfg.scroll, 1)
    hills.push(hill)

    if (layer === 1) {
      const bushCount = intBetween(rngFromString(`${seed}|bushes`), 4, 10)
      for (let b = 0; b < bushCount; b++) {
        const rng = rngFromString(`${seed}|bush|${b}`)
        const bx = intBetween(rng, 40, worldWidth - 40)
        const by = h * cfg.height + 20 + rng() * 30
        const bush = scene.add.graphics().setDepth(-4).setScrollFactor(0.22, 1)
        bush.fillStyle(pal.bush, 0.9)
        bush.fillCircle(0, 0, 14 + rng() * 8)
        bush.fillCircle(-12, 4, 10 + rng() * 6)
        bush.fillCircle(12, 4, 10 + rng() * 6)
        bush.setPosition(bx, by)
      }
    }
  }

  return {
    skyGradient,
    clouds,
    hills,
    scrollFactors: [0, 0.08, 0.18],
  }
}

export function scrollNintendoBackground(
  layers: BackgroundLayers,
  scrollX: number,
  parallaxMul = 1,
) {
  layers.clouds.getChildren().forEach((child) => {
    const img = child as Phaser.GameObjects.Image
    const sf = img.scrollFactorX
    img.x = img.getData('baseX') ?? img.x
    if (!img.getData('baseX')) img.setData('baseX', img.x)
    img.x = (img.getData('baseX') as number) - scrollX * sf * parallaxMul
  })
}

/** Decorative brick blocks floating in the sky (question-block aesthetic). */
export function spawnDecorBlocks(
  scene: Phaser.Scene,
  template: PlatformerTemplateConfig,
  worldWidth: number,
  h: number,
): Phaser.GameObjects.Group {
  const pal = getNintendoPalette(template.meta.theme)
  const seed = template.sessionSeed ?? 'default'
  const group = scene.add.group()
  const count = intBetween(rngFromString(`${seed}|deco`), 3, 8)

  for (let i = 0; i < count; i++) {
    const rng = rngFromString(`${seed}|deco|${i}`)
    const bx = intBetween(rng, worldWidth * 0.15, worldWidth * 0.85)
    const by = intBetween(rng, h * 0.15, h * 0.45)
    const block = scene.add.graphics().setDepth(1).setScrollFactor(0.35 + rng() * 0.15, 0)
    block.fillStyle(pal.brickShadow, 1)
    block.fillRect(0, 0, 32, 32)
    block.fillStyle(pal.brick, 1)
    block.fillRect(2, 2, 28, 28)
    block.fillStyle(pal.brickHighlight, 1)
    block.fillRect(4, 4, 24, 4)
    block.fillRect(4, 4, 4, 24)
    block.fillStyle(pal.coinShine, 0.6)
    block.fillRect(12, 12, 8, 8)
    block.setPosition(bx, by)
    group.add(block)
  }
  return group
}

export { getSkyGradientColor, getSkyBottomColor }
