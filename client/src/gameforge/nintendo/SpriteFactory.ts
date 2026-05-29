import Phaser from 'phaser'

import type { EnemyType, Theme } from '../GameConfig'
import { getNintendoPalette, type NintendoPalette } from './NintendoPalette'

const PX = 3

type PixelGrid = Array<Array<string | null>>

function drawGrid(
  g: Phaser.GameObjects.Graphics,
  grid: PixelGrid,
  palette: Record<string, number>,
  offsetX = 0,
  offsetY = 0,
) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const key = grid[y][x]
      if (key == null) continue
      const color = palette[String(key)] ?? key
      g.fillStyle(color, 1)
      g.fillRect(offsetX + x * PX, offsetY + y * PX, PX, PX)
    }
  }
}

function heroGrid(): PixelGrid {
  return [
    [null, null, null, 'o', 'o', 'o', 'o', 'o', 'o', null, null, null],
    [null, null, 'o', 'c', 'c', 'c', 'c', 'c', 'c', 'o', null, null],
    [null, 'o', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'o', null],
    [null, 'o', 'c', 'c', 's', 's', 's', 's', 'c', 'c', 'o', null],
    [null, 'o', 'c', 's', 's', 's', 's', 's', 's', 'c', 'o', null],
    [null, 'o', 'c', 's', 'k', 's', 's', 'k', 's', 'c', 'o', null],
    [null, 'o', 'c', 's', 's', 's', 's', 's', 's', 'c', 'o', null],
    [null, 'o', 'c', 'c', 's', 's', 's', 's', 'c', 'c', 'o', null],
    [null, null, 'o', 't', 't', 't', 't', 't', 't', 'o', null, null],
    [null, null, 'o', 't', 't', 't', 't', 't', 't', 'o', null, null],
    [null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null],
    [null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null],
    [null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null],
    [null, null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null, null],
    [null, null, 'o', 'h', 'h', null, null, 'h', 'h', 'o', null, null],
    [null, null, 'o', 'h', 'h', null, null, 'h', 'h', 'o', null, null],
  ]
}

function goombaGrid(): PixelGrid {
  return [
    [null, null, 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', null, null],
    [null, 'o', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'o', null],
    ['o', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'o'],
    ['o', 'g', 'g', 'e', 'g', 'g', 'g', 'g', 'e', 'g', 'g', 'o'],
    ['o', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'o'],
    ['o', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'o'],
    [null, 'o', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'g', 'o', null],
    [null, null, 'o', 'f', 'f', 'o', 'o', 'f', 'f', 'o', null, null],
  ]
}

function koopaGrid(): PixelGrid {
  return [
    [null, null, null, 'o', 'o', 'o', 'o', 'o', 'o', null, null, null],
    [null, null, 'o', 's', 's', 's', 's', 's', 's', 'o', null, null],
    [null, 'o', 's', 's', 'l', 'l', 'l', 'l', 's', 's', 'o', null],
    [null, 'o', 's', 'l', 'l', 'l', 'l', 'l', 'l', 's', 'o', null],
    [null, 'o', 's', 'l', 'l', 'l', 'l', 'l', 'l', 's', 'o', null],
    [null, 'o', 's', 's', 'l', 'l', 'l', 'l', 's', 's', 'o', null],
    [null, null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null, null],
    [null, null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null, null],
    [null, null, null, 'o', 'f', 'f', 'f', 'f', 'o', null, null, null],
  ]
}

function booGrid(): PixelGrid {
  return [
    [null, null, 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', null, null],
    [null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null],
    ['o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o'],
    ['o', 'b', 'b', 'e', 'b', 'b', 'b', 'b', 'e', 'b', 'b', 'o'],
    ['o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o'],
    ['o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o'],
    [null, 'o', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'o', null],
    [null, null, 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', null, null],
  ]
}

function paletteMap(p: NintendoPalette): Record<string, number> {
  return {
    o: p.heroOutline,
    c: p.heroCap,
    cs: p.heroCapShadow,
    s: p.heroSkin,
    k: p.heroOutline,
    t: p.heroShirt,
    b: p.heroOveralls,
    h: p.heroShoe,
    g: p.goombaBody,
    e: p.goombaEye,
    f: p.goombaFeet,
    l: p.koopaShellLight,
    s2: p.koopaShell,
    bb: p.koopaBody,
    boo: p.booBody,
  }
}

function enemyPaletteMap(p: NintendoPalette, type: EnemyType): Record<string, number> {
  const base = paletteMap(p)
  if (type === 'robots') {
    return { ...base, s: p.koopaShell, l: p.koopaShellLight, b: p.koopaBody, f: p.goombaFeet, o: p.heroOutline }
  }
  if (type === 'aliens') {
    return { ...base, b: p.booBody, e: p.booEye, o: p.heroOutline }
  }
  return { ...base, g: p.goombaBody, e: p.goombaEye, f: p.goombaFeet, o: p.heroOutline }
}

export type NintendoTextureKeys = {
  hero: string
  platform: string
  ground: string
  enemy: string
  coin: string
  fireball: string
  flag: string
  cloud: string
  questionBlock: string
  questionBlockUsed: string
  pipe: string
  mushroom: string
  flower: string
  star: string
  checkpoint: string
  checkpointActive: string
}

export function createNintendoTextures(
  scene: Phaser.Scene,
  theme: Theme,
  enemyType: EnemyType,
): NintendoTextureKeys {
  const pal = getNintendoPalette(theme)
  const keys: NintendoTextureKeys = {
    hero: 'nintHero',
    platform: 'nintPlatform',
    ground: 'nintGround',
    enemy: `nintEnemy_${enemyType}`,
    coin: 'nintCoin',
    fireball: 'nintFireball',
    flag: 'nintFlag',
    cloud: 'nintCloud',
    questionBlock: 'nintQuestion',
    questionBlockUsed: 'nintQuestionUsed',
    pipe: 'nintPipe',
    mushroom: 'nintMushroom',
    flower: 'nintFlower',
    star: 'nintStar',
    checkpoint: 'nintCheckpoint',
    checkpointActive: 'nintCheckpointActive',
  }

  if (scene.textures.exists(keys.hero) && scene.textures.exists(keys.questionBlock)) return keys

  const g = scene.make.graphics({ x: 0, y: 0 })

  drawGrid(g, heroGrid(), {
    o: pal.heroOutline,
    c: pal.heroCap,
    s: pal.heroSkin,
    k: pal.heroOutline,
    t: pal.heroShirt,
    b: pal.heroOveralls,
    h: pal.heroShoe,
  })
  g.generateTexture(keys.hero, 12 * PX, 16 * PX)

  g.clear()
  const pw = 16
  const ph = 4
  g.fillStyle(pal.dirtDark, 1)
  g.fillRect(0, ph * PX, pw * PX, 2 * PX)
  g.fillStyle(pal.dirt, 1)
  g.fillRect(0, (ph + 1) * PX, pw * PX, PX)
  g.fillStyle(pal.grassDark, 1)
  g.fillRect(0, 0, pw * PX, PX)
  g.fillStyle(pal.grass, 1)
  g.fillRect(0, PX, pw * PX, PX)
  for (let x = 0; x < pw; x += 4) {
    g.fillStyle(pal.grassDark, 1)
    g.fillRect(x * PX, 0, PX, PX)
  }
  g.generateTexture(keys.platform, pw * PX, (ph + 2) * PX)

  g.clear()
  const gw = 32
  g.fillStyle(pal.dirtDark, 1)
  g.fillRect(0, 2 * PX, gw * PX, 3 * PX)
  g.fillStyle(pal.dirt, 1)
  g.fillRect(0, 3 * PX, gw * PX, 2 * PX)
  g.fillStyle(pal.grassDark, 1)
  g.fillRect(0, 0, gw * PX, PX)
  g.fillStyle(pal.grass, 1)
  g.fillRect(0, PX, gw * PX, PX)
  for (let x = 0; x < gw; x += 4) {
    g.fillStyle(x % 8 === 0 ? pal.grassDark : pal.grass, 1)
    g.fillRect(x * PX, 0, 2 * PX, 2 * PX)
  }
  g.generateTexture(keys.ground, gw * PX, 5 * PX)

  g.clear()
  const enemyGrid =
    enemyType === 'robots' ? koopaGrid() : enemyType === 'aliens' ? booGrid() : goombaGrid()
  drawGrid(g, enemyGrid, enemyPaletteMap(pal, enemyType))
  g.generateTexture(keys.enemy, 12 * PX, enemyGrid.length * PX)

  g.clear()
  g.fillStyle(pal.coin, 1)
  g.fillCircle(8, 8, 7)
  g.fillStyle(pal.coinShine, 1)
  g.fillRect(4, 3, 4, 3)
  g.fillStyle(pal.coin, 1)
  g.lineStyle(2, pal.coinShine, 0.8)
  g.strokeCircle(8, 8, 7)
  g.generateTexture(keys.coin, 16, 16)

  g.clear()
  g.fillStyle(0xff6020, 1)
  g.fillCircle(6, 6, 5)
  g.fillStyle(0xffe040, 1)
  g.fillCircle(4, 4, 2)
  g.generateTexture(keys.fireball, 12, 12)

  g.clear()
  g.fillStyle(pal.flagPole, 1)
  g.fillRect(2, 0, 3, 80)
  g.fillStyle(pal.flagCloth, 1)
  g.fillTriangle(5, 8, 40, 20, 5, 32)
  g.fillStyle(0xffffff, 0.3)
  g.fillTriangle(5, 8, 20, 14, 5, 20)
  g.generateTexture(keys.flag, 42, 80)

  g.clear()
  g.fillStyle(pal.cloud, 1)
  g.fillCircle(16, 14, 10)
  g.fillCircle(28, 16, 12)
  g.fillCircle(42, 14, 10)
  g.fillCircle(22, 10, 8)
  g.fillCircle(36, 10, 8)
  g.fillStyle(pal.cloudHighlight, 0.5)
  g.fillCircle(20, 10, 5)
  g.generateTexture(keys.cloud, 56, 28)

  g.clear()
  g.fillStyle(pal.coin, 1)
  g.fillRect(0, 0, 32, 32)
  g.fillStyle(pal.coinShine, 1)
  g.fillRect(4, 4, 24, 8)
  g.fillRect(4, 4, 8, 24)
  g.fillStyle(0x000000, 0.35)
  g.fillRect(12, 12, 8, 10)
  g.lineStyle(2, pal.heroOutline, 0.5)
  g.strokeRect(0, 0, 32, 32)
  g.generateTexture(keys.questionBlock, 32, 32)

  g.clear()
  g.fillStyle(pal.brick, 1)
  g.fillRect(0, 0, 32, 32)
  g.fillStyle(pal.brickHighlight, 0.5)
  g.fillRect(4, 4, 24, 4)
  g.lineStyle(2, pal.brickShadow, 0.6)
  g.strokeRect(0, 0, 32, 32)
  g.generateTexture(keys.questionBlockUsed, 32, 32)

  g.clear()
  g.fillStyle(pal.grass, 1)
  g.fillRect(8, 0, 32, 12)
  g.fillEllipse(24, 6, 36, 14)
  g.fillStyle(0x008830, 1)
  g.fillRect(12, 12, 24, 72)
  g.fillStyle(0x006622, 1)
  g.fillRect(16, 12, 8, 72)
  g.fillStyle(0x004418, 1)
  g.fillRect(12, 80, 24, 8)
  g.generateTexture(keys.pipe, 48, 88)

  g.clear()
  g.fillStyle(0xff4444, 1)
  g.fillEllipse(16, 20, 28, 24)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(10, 8, 5)
  g.fillCircle(22, 8, 5)
  g.fillStyle(0xcc2222, 1)
  g.fillRect(6, 28, 20, 8)
  g.generateTexture(keys.mushroom, 32, 36)

  g.clear()
  g.fillStyle(pal.heroCap, 1)
  g.fillRect(10, 18, 12, 16)
  g.fillStyle(pal.heroCapShadow, 1)
  g.fillCircle(16, 14, 12)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(12, 10, 3)
  g.fillCircle(20, 10, 3)
  g.generateTexture(keys.flower, 32, 34)

  g.clear()
  g.fillStyle(pal.coin, 1)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    g.fillTriangle(16, 16, 16 + Math.cos(a) * 14, 16 + Math.sin(a) * 14, 16 + Math.cos(a + 0.4) * 8, 16 + Math.sin(a + 0.4) * 8)
  }
  g.fillStyle(0xffffff, 1)
  g.fillCircle(16, 16, 5)
  g.generateTexture(keys.star, 32, 32)

  g.clear()
  g.fillStyle(pal.flagPole, 1)
  g.fillRect(14, 0, 4, 56)
  g.fillStyle(0x888888, 1)
  g.fillRect(10, 54, 12, 6)
  g.fillStyle(0xcccccc, 1)
  g.fillRect(16, 4, 14, 10)
  g.generateTexture(keys.checkpoint, 32, 60)

  g.clear()
  g.fillStyle(pal.flagPole, 1)
  g.fillRect(14, 0, 4, 56)
  g.fillStyle(0x888888, 1)
  g.fillRect(10, 54, 12, 6)
  g.fillStyle(pal.flagCloth, 1)
  g.fillRect(16, 4, 14, 10)
  g.generateTexture(keys.checkpointActive, 32, 60)

  g.destroy()
  return keys
}

export function getSkyGradientColor(theme: Theme): string {
  const p = getNintendoPalette(theme)
  const top = `#${p.skyTop.toString(16).padStart(6, '0')}`
  return top
}

export function getSkyBottomColor(theme: Theme): string {
  const p = getNintendoPalette(theme)
  return `#${p.skyBottom.toString(16).padStart(6, '0')}`
}
