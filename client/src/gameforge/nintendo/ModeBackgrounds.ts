import Phaser from 'phaser'

import type { Theme } from '../GameConfig'
import { getNintendoPalette } from './NintendoPalette'
import { floatBetween, intBetween, rngFromString } from '../sessionSeed'

export const RETRO_HUD_FONT = '"Press Start 2P", "Courier New", monospace'

/** Star Fox–style space backdrop for vertical shooter. */
export function createShooterBackground(
  scene: Phaser.Scene,
  theme: Theme,
  sessionSeed: string,
  starCount: number,
): Phaser.GameObjects.Group {
  const pal = getNintendoPalette(theme)
  const w = scene.scale.width
  const h = scene.scale.height
  const stars = scene.add.group()

  scene.cameras.main.setBackgroundColor(pal.skyTop)

  const bg = scene.add.graphics().setDepth(-5).setScrollFactor(0)
  bg.fillGradientStyle(pal.skyTop, pal.skyTop, 0x080818, 0x080818, 1)
  bg.fillRect(0, 0, w, h)

  scene.add.circle(w * 0.15, h * 0.2, 90, pal.hillFar, 0.25).setDepth(-4).setScrollFactor(0)
  scene.add.circle(w * 0.85, h * 0.15, 110, pal.heroCap, 0.15).setDepth(-4).setScrollFactor(0)
  scene.add.circle(w * 0.5, h * 0.65, 140, pal.heroOveralls, 0.08).setDepth(-4).setScrollFactor(0)

  const rng = rngFromString(`${sessionSeed}|shBg`)
  for (let i = 0; i < starCount; i++) {
    const sr = rngFromString(`${sessionSeed}|shStar|${i}`)
    const tint = i % 3 === 0 ? pal.coinShine : i % 3 === 1 ? 0xffffff : pal.cloudHighlight
    const star = scene.add.circle(
      intBetween(sr, 0, w),
      intBetween(sr, 0, h),
      intBetween(sr, 1, 2),
      tint,
      floatBetween(sr, 0.25, 0.9),
    )
    star.setDepth(-3)
    stars.add(star)
  }

  const planet = scene.add.circle(w * 0.78, h * 0.82, 48, pal.hillNear, 0.35).setDepth(-2)
  planet.setScrollFactor(0.05, 0)

  return stars
}

/** Mario battle–style arena floor. */
export function createArenaBackground(scene: Phaser.Scene, theme: Theme): void {
  const pal = getNintendoPalette(theme)
  const w = scene.scale.width
  const h = scene.scale.height
  const pad = 48

  scene.cameras.main.setBackgroundColor(pal.skyBottom)

  const sky = scene.add.graphics().setDepth(-5)
  sky.fillGradientStyle(pal.skyTop, pal.skyTop, pal.skyBottom, pal.skyBottom, 1)
  sky.fillRect(0, 0, w, h)

  const floor = scene.add.graphics().setDepth(0)
  floor.fillStyle(pal.grassDark, 1)
  floor.fillRect(pad, pad, w - pad * 2, h - pad * 2)
  floor.fillStyle(pal.grass, 1)
  for (let y = pad; y < h - pad; y += 16) {
    for (let x = pad; x < w - pad; x += 16) {
      const checker = ((x + y) / 16) % 2 === 0
      floor.fillStyle(checker ? pal.grass : pal.grassDark, 1)
      floor.fillRect(x, y, 16, 16)
    }
  }

  const border = scene.add.graphics().setDepth(1)
  border.lineStyle(4, pal.dirtDark, 1)
  border.strokeRect(pad - 4, pad - 4, w - (pad - 4) * 2, h - (pad - 4) * 2)
  border.lineStyle(2, pal.coinShine, 0.8)
  border.strokeRect(pad + 8, pad + 8, w - (pad + 8) * 2, h - (pad + 8) * 2)

  border.lineStyle(3, pal.heroCap, 0.5)
  border.strokeCircle(w / 2, h / 2, 70)
  border.lineStyle(1, 0xffffff, 0.2)
  border.strokeCircle(w / 2, h / 2, 100)

  scene.add
    .text(w / 2, pad - 28, '⚔ BATTLE ARENA', {
      fontFamily: RETRO_HUD_FONT,
      fontSize: '10px',
      color: pal.hudText,
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(2)
    .setScrollFactor(0)
}

/** Punch-Out–style boxing ring and crowd backdrop. */
export function createBoxingBackground(
  scene: Phaser.Scene,
  theme: Theme,
  sessionSeed: string,
): { ringBounds: { minX: number; maxX: number; floorY: number } } {
  const pal = getNintendoPalette(theme)
  const w = scene.scale.width
  const h = scene.scale.height

  scene.cameras.main.setBackgroundColor(0x1a1028)

  scene.add.rectangle(w / 2, h / 2, w, h, 0x120818, 1).setDepth(0)
  scene.add.circle(w * 0.5, h * 0.35, h * 0.28, pal.heroCap, 0.12).setDepth(0)

  const ringW = w * 0.76
  const ringH = h * 0.36
  const ringX = (w - ringW) / 2
  const ringY = h * 0.5
  const floorY = ringY + ringH * 0.72

  const canvas = scene.add.graphics().setDepth(2)
  canvas.fillStyle(pal.heroOveralls, 0.95)
  canvas.fillRoundedRect(ringX, ringY, ringW, ringH, 16)
  canvas.fillStyle(pal.skyBottom, 0.35)
  canvas.fillRoundedRect(ringX + 10, ringY + 8, ringW - 20, ringH - 16, 12)

  const ropes = scene.add.graphics().setDepth(3)
  const ropeColors = [0xff4444, 0xffffff, 0x4444ff]
  for (let i = 0; i < 3; i++) {
    const y = ringY - 18 + i * 12
    ropes.lineStyle(4, ropeColors[i], 0.85)
    ropes.lineBetween(ringX - 10, y, ringX + ringW + 10, y)
  }
  ropes.lineStyle(5, 0xffffff, 0.5)
  ropes.strokeRoundedRect(ringX, ringY, ringW, ringH, 16)

  const rng = rngFromString(`${sessionSeed}|boxCrowd`)
  for (let row = 0; row < 4; row++) {
    const y = ringY - 40 - row * 22
    const count = 14 + row * 4
    for (let i = 0; i < count; i++) {
      const x = ringX + (i / count) * ringW + floatBetween(rng, -6, 6)
      const colors = [pal.heroCap, pal.heroOveralls, pal.grass, pal.coin]
      const body = scene.add.rectangle(x, y, 8, 12, colors[row % colors.length], 0.85).setDepth(1)
      scene.add.circle(x, y - 8, 4, pal.heroSkin, 1).setDepth(1)
      body.setAlpha(0.5 + row * 0.12)
    }
  }

  scene.add
    .text(w / 2, ringY - 58, '🥊 TITLE FIGHT', {
      fontFamily: RETRO_HUD_FONT,
      fontSize: '11px',
      color: '#ffe066',
      stroke: '#000000',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(4)

  return {
    ringBounds: {
      minX: w * 0.19,
      maxX: w * 0.81,
      floorY,
    },
  }
}
