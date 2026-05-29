import Phaser from 'phaser'

import type { PlatformerTemplateConfig } from '../config'

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  private readonly enemyType: PlatformerTemplateConfig['enemies']['enemyType']
  private readonly speed: number
  private readonly chaseDistance: number
  private readonly guardMinX: number
  private readonly guardMaxX: number
  private direction: 1 | -1
  private dead = false
  private baseY = 0
  private floatPhase = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    template: PlatformerTemplateConfig,
    direction: 1 | -1,
    bounds: { minX: number; maxX: number },
  ) {
    super(scene, x, y, textureKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.enemyType = template.enemies.enemyType
    this.speed = template.enemies.speed
    this.chaseDistance = template.enemies.chaseDistance
    this.guardMinX = bounds.minX
    this.guardMaxX = bounds.maxX
    this.direction = direction
    this.baseY = y
    this.floatPhase = Math.random() * Math.PI * 2

    this.setDepth(4)
    this.setCollideWorldBounds(false)
    this.setMaxVelocity(250, 800)
    this.setDragX(0)

    const body = this.body as Phaser.Physics.Arcade.Body | null
    if (body) {
      body.allowGravity = this.enemyType !== 'aliens'
      if (this.enemyType === 'aliens') body.setVelocityY(0)
    }
  }

  isDead() {
    return this.dead
  }

  /** Returns true if the player stomped this enemy from above. */
  tryStomp(player: Phaser.Physics.Arcade.Sprite): boolean {
    if (this.dead || !this.active) return false
    const playerBody = player.body as Phaser.Physics.Arcade.Body | null
    if (!playerBody) return false

    const playerBottom = player.y + player.displayHeight * 0.4
    const enemyTop = this.y - this.displayHeight * 0.35
    const falling = playerBody.velocity.y > 0
    const above = playerBottom <= enemyTop + 8
    const overlappingX = Math.abs(player.x - this.x) < this.displayWidth * 0.55

    if (falling && above && overlappingX) {
      this.defeat()
      return true
    }
    return false
  }

  defeat() {
    if (this.dead) return
    this.dead = true
    this.setActive(false)
    this.setVisible(false)
    const body = this.body as Phaser.Physics.Arcade.Body | null
    if (body) body.enable = false
  }

  updateAI(player: Phaser.Physics.Arcade.Sprite, time: number) {
    if (this.dead || !this.active) return

    if (this.enemyType === 'aliens') {
      this.floatPhase += 0.03
      this.y = this.baseY + Math.sin(this.floatPhase) * 6
      const toPlayer = player.x - this.x
      if (Math.abs(toPlayer) < this.chaseDistance * 0.6) {
        this.x += Math.sign(toPlayer) * this.speed * 0.008
      }
      return
    }

    const playerX = player.x
    const toPlayer = playerX - this.x
    const distX = Math.abs(toPlayer)
    const playerNearGuardArea =
      Math.abs(playerX - (this.guardMinX + this.guardMaxX) / 2) < this.chaseDistance * 0.45
    const shouldChase = this.shouldChase(distX) && (playerNearGuardArea || distX < 60)

    if (shouldChase) {
      const dir = toPlayer >= 0 ? 1 : -1
      this.setVelocityX(dir * this.speed * 1.35)
      this.direction = dir
      this.setFlipX(dir < 0)
    } else {
      if (this.x <= this.guardMinX) {
        this.direction = 1
        this.setFlipX(false)
      }
      if (this.x >= this.guardMaxX) {
        this.direction = -1
        this.setFlipX(true)
      }
      this.setVelocityX(this.direction * this.speed * 0.65)
    }

    this.animateWalk(time)
  }

  private animateWalk(time: number) {
    if (this.enemyType === 'robots') return
    const wobble = Math.sin(time * 0.012) * 0.04
    this.setScale(1 + wobble, 1 - wobble)
  }

  private shouldChase(distanceX: number) {
    switch (this.enemyType) {
      case 'drones':
        return distanceX < this.chaseDistance
      case 'robots':
        return distanceX < this.chaseDistance * 0.85
      case 'aliens':
        return distanceX < this.chaseDistance * 1.1
      default:
        return distanceX < this.chaseDistance
    }
  }
}
