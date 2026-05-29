import Phaser from 'phaser'

import type { NintendoPalette } from './NintendoPalette'
import { playSfx } from './ChiptuneAudio'

export function emitLandDust(
  scene: Phaser.Scene,
  x: number,
  y: number,
  palette: NintendoPalette,
  facingLeft: boolean,
) {
  playSfx('land')
  const particles = scene.add.particles(x, y, '__WHITE', {
    speed: { min: 20, max: 80 },
    angle: { min: facingLeft ? 160 : 20, max: facingLeft ? 200 : 60 },
    scale: { start: 0.35, end: 0 },
    lifespan: 280,
    quantity: 5,
    tint: palette.particleDust,
    gravityY: 200,
  })
  particles.setDepth(6)
  scene.time.delayedCall(320, () => particles.destroy())
}

export function emitCoinSparkle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  palette: NintendoPalette,
) {
  playSfx('coin')
  const burst = scene.add.particles(x, y, '__WHITE', {
    speed: { min: 40, max: 140 },
    scale: { start: 0.5, end: 0 },
    lifespan: 400,
    quantity: 8,
    tint: [palette.particleSpark, palette.coin, palette.coinShine],
    gravityY: -60,
  })
  burst.setDepth(10)
  scene.time.delayedCall(450, () => burst.destroy())

  const pop = scene.add.text(x, y - 12, '+100', {
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '10px',
    color: '#ffe066',
    stroke: '#000000',
    strokeThickness: 3,
  })
  pop.setOrigin(0.5).setDepth(11)
  scene.tweens.add({
    targets: pop,
    y: y - 40,
    alpha: 0,
    duration: 600,
    ease: 'Cubic.easeOut',
    onComplete: () => pop.destroy(),
  })
}

export function emitEnemyDefeat(
  scene: Phaser.Scene,
  x: number,
  y: number,
  palette: NintendoPalette,
) {
  playSfx('enemyDefeat')
  const puff = scene.add.particles(x, y, '__WHITE', {
    speed: { min: 30, max: 100 },
    scale: { start: 0.6, end: 0 },
    lifespan: 350,
    quantity: 10,
    tint: [palette.goombaBody, palette.particleDust, 0xffffff],
    gravityY: 150,
  })
  puff.setDepth(8)
  scene.time.delayedCall(400, () => puff.destroy())
}

export function emitStompBounce(scene: Phaser.Scene, player: Phaser.Physics.Arcade.Sprite) {
  playSfx('stomp')
  scene.tweens.add({
    targets: player,
    scaleY: { from: 0.7, to: 1 },
    scaleX: { from: 1.15, to: 1 },
    duration: 120,
    ease: 'Back.easeOut',
  })
}

export function squashOnLand(player: Phaser.Physics.Arcade.Sprite, scene: Phaser.Scene) {
  scene.tweens.add({
    targets: player,
    scaleY: 0.85,
    scaleX: 1.08,
    duration: 60,
    yoyo: true,
    ease: 'Sine.easeOut',
  })
}

export function stretchOnJump(player: Phaser.Physics.Arcade.Sprite, scene: Phaser.Scene) {
  scene.tweens.add({
    targets: player,
    scaleY: 1.12,
    scaleX: 0.92,
    duration: 80,
    yoyo: true,
    ease: 'Sine.easeOut',
  })
}

export function flagCelebration(scene: Phaser.Scene, flagX: number, flagY: number) {
  playSfx('fanfare')
  scene.cameras.main.flash(200, 255, 255, 200, false)
  const confetti = scene.add.particles(flagX, flagY - 40, '__WHITE', {
    speed: { min: 60, max: 200 },
    angle: { min: 200, max: 340 },
    scale: { start: 0.4, end: 0 },
    lifespan: 800,
    quantity: 20,
    tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff],
    gravityY: 300,
  })
  confetti.setDepth(15)
  scene.time.delayedCall(900, () => confetti.destroy())
}

export function screenShake(scene: Phaser.Scene, intensity = 0.004, duration = 80) {
  scene.cameras.main.shake(duration, intensity)
}
