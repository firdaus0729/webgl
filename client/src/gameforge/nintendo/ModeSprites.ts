import Phaser from 'phaser'

import type { EnemyType, Theme } from '../GameConfig'
import { getNintendoPalette, type NintendoPalette } from './NintendoPalette'

const PX = 3
type PixelGrid = Array<Array<string | null>>

function drawGrid(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  palette: Record<string, number>,
) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const key = grid[y][x]
      if (key == null) continue
      g.fillStyle(palette[String(key)] ?? (key as unknown as number), 1)
      g.fillRect(x * PX, y * PX, PX, PX)
    }
  }
}

function palMap(p: NintendoPalette): Record<string, number> {
  return {
    o: p.heroOutline,
    h: p.heroCap,
    b: p.heroOveralls,
    s: p.heroSkin,
    e: p.goombaEye,
    g: p.goombaBody,
    f: p.goombaFeet,
    c: p.coin,
    w: p.coinShine,
    k: p.koopaShell,
    l: p.koopaShellLight,
    r: p.heroCapShadow,
    t: p.heroOveralls,
  }
}

const shooterPlayerGrid: PixelGrid = [
  [null, null, null, 'o', 'o', 'o', null, null, null],
  [null, null, 'o', 'b', 'b', 'b', 'o', null, null],
  [null, 'o', 'b', 'b', 'w', 'b', 'b', 'o', null],
  ['o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o'],
  ['o', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'o'],
  [null, 'o', 'b', 'b', 'b', 'b', 'b', 'o', null],
  [null, null, 'o', 'r', 'r', 'r', 'o', null, null],
]

const shooterInvaderGrid: PixelGrid = [
  [null, 'o', 'g', 'g', 'g', 'g', 'g', 'o', null],
  ['o', 'g', 'e', 'g', 'g', 'g', 'e', 'g', 'o'],
  ['o', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'o'],
  [null, 'o', 'g', 'g', 'g', 'g', 'g', 'o', null],
  [null, 'o', 'f', 'o', 'o', 'o', 'f', 'o', null],
]

const arenaPlayerGrid: PixelGrid = [
  [null, null, 'o', 'h', 'h', 'h', 'o', null, null],
  [null, 'o', 'h', 'h', 's', 'h', 'h', 'o', null],
  ['o', 'h', 'h', 's', 's', 's', 'h', 'h', 'o'],
  ['o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o'],
  [null, 'o', 'b', 'b', 'b', 'b', 'b', 'o', null],
  [null, null, 'o', 'f', 'o', 'f', 'o', null, null],
]

const boxerGrid: PixelGrid = [
  [null, null, null, 'o', 'o', 'o', 'o', null, null, null],
  [null, null, 'o', 's', 's', 's', 's', 'o', null, null],
  [null, 'o', 's', 's', 's', 's', 's', 's', 'o', null],
  [null, 'o', 's', 'k', 's', 's', 'k', 's', 'o', null],
  ['o', 't', 't', 't', 't', 't', 't', 't', 't', 'o'],
  ['o', 't', 't', 't', 't', 't', 't', 't', 't', 'o'],
  ['o', 'g', 'g', 't', 't', 't', 't', 'g', 'g', 'o'],
  [null, 'o', 'g', 'g', null, null, 'g', 'g', 'o', null],
  [null, null, 'o', 'o', null, null, 'o', 'o', null, null],
]

export type ShooterTextureKeys = {
  player: string
  enemy: string
  laser: string
}

export type ArenaTextureKeys = {
  player: string
  enemy: string
  bullet: string
}

export type BoxingTextureKeys = {
  player: string
  enemy: string
}

export function createShooterTextures(scene: Phaser.Scene, theme: Theme): ShooterTextureKeys {
  const keys = { player: 'nintShip', enemy: 'nintInvader', laser: 'nintLaser' }
  if (scene.textures.exists(keys.player)) return keys

  const p = getNintendoPalette(theme)
  const map = palMap(p)
  const g = scene.make.graphics({ x: 0, y: 0 })

  drawGrid(g, shooterPlayerGrid, map)
  g.generateTexture(keys.player, 9 * PX, 7 * PX)

  g.clear()
  drawGrid(g, shooterInvaderGrid, map)
  g.generateTexture(keys.enemy, 9 * PX, 5 * PX)

  g.clear()
  g.fillStyle(p.coinShine, 1)
  g.fillRect(0, 0, 4, 14)
  g.fillStyle(p.coin, 1)
  g.fillRect(1, 2, 2, 10)
  g.generateTexture(keys.laser, 4, 14)

  g.destroy()
  return keys
}

export function createArenaTextures(
  scene: Phaser.Scene,
  theme: Theme,
  enemyType: EnemyType,
): ArenaTextureKeys {
  const keys = {
    player: 'nintArenaHero',
    enemy: `nintArenaFoe_${enemyType}`,
    bullet: 'nintArenaBullet',
  }
  if (scene.textures.exists(keys.player) && scene.textures.exists(keys.enemy)) return keys

  const p = getNintendoPalette(theme)
  const map = palMap(p)
  const g = scene.make.graphics({ x: 0, y: 0 })

  drawGrid(g, arenaPlayerGrid, map)
  g.generateTexture(keys.player, 9 * PX, 6 * PX)

  g.clear()
  if (enemyType === 'robots') {
    drawGrid(
      g,
      [
        [null, 'o', 'k', 'k', 'k', 'k', 'o', null],
        ['o', 'k', 'l', 'l', 'l', 'l', 'k', 'o'],
        ['o', 'k', 'l', 'l', 'l', 'l', 'k', 'o'],
        [null, 'o', 'g', 'g', 'g', 'g', 'o', null],
        [null, null, 'o', 'f', 'f', 'o', null, null],
      ],
      map,
    )
  } else if (enemyType === 'aliens') {
    drawGrid(
      g,
      [
        [null, 'o', 'b', 'b', 'b', 'b', 'o', null],
        ['o', 'b', 'e', 'b', 'b', 'e', 'b', 'o'],
        ['o', 'b', 'b', 'b', 'b', 'b', 'b', 'o'],
        [null, 'o', 'o', 'o', 'o', 'o', 'o', null],
      ],
      { ...map, b: p.booBody, e: p.booEye },
    )
  } else {
    drawGrid(
      g,
      [
        [null, 'o', 'g', 'g', 'g', 'g', 'o', null],
        ['o', 'g', 'e', 'g', 'g', 'e', 'g', 'o'],
        ['o', 'g', 'g', 'g', 'g', 'g', 'g', 'o'],
        [null, 'o', 'f', 'o', 'o', 'f', 'o', null],
      ],
      map,
    )
  }
  g.generateTexture(keys.enemy, 8 * PX, 5 * PX)

  g.clear()
  g.fillStyle(p.coin, 1)
  g.fillCircle(6, 6, 5)
  g.fillStyle(p.coinShine, 1)
  g.fillCircle(4, 4, 2)
  g.generateTexture(keys.bullet, 12, 12)

  g.destroy()
  return keys
}

export function createBoxingTextures(scene: Phaser.Scene, theme: Theme): BoxingTextureKeys {
  const keys = { player: 'nintBoxerP', enemy: 'nintBoxerE' }
  if (scene.textures.exists(keys.player)) return keys

  const p = getNintendoPalette(theme)
  const g = scene.make.graphics({ x: 0, y: 0 })

  const playerMap = {
    o: p.heroOutline,
    s: p.heroSkin,
    k: p.heroOutline,
    t: p.heroOveralls,
    g: p.heroCap,
  }
  drawGrid(g, boxerGrid, playerMap)
  g.generateTexture(keys.player, 10 * PX, 9 * PX)

  g.clear()
  const enemyMap = {
    o: p.heroOutline,
    s: p.heroSkin,
    k: p.heroOutline,
    t: p.heroCapShadow,
    g: p.goombaBody,
  }
  drawGrid(g, boxerGrid, enemyMap)
  g.generateTexture(keys.enemy, 10 * PX, 9 * PX)

  g.destroy()
  return keys
}

export { getNintendoPalette, type NintendoPalette }
