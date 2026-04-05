import Phaser from 'phaser'

import type { PlatformerTemplateConfig } from '../config'

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  private readonly enemyType: PlatformerTemplateConfig['enemies']['enemyType']
  private readonly speed: number
  private readonly chaseDistance: number
  private readonly guardCenterX: number
  private readonly guardMinX: number
  private readonly guardMaxX: number

  private direction: 1 | -1

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
    this.guardCenterX = (bounds.minX + bounds.maxX) / 2
    this.direction = direction

    this.setDepth(4)
    this.setCollideWorldBounds(false)
    this.setMaxVelocity(250, 800)
    this.setDragX(300)

    // Bridge-only constraint: enemies must not fall off bridges.
    const body = this.body as Phaser.Physics.Arcade.Body | null
    if (body) {
      body.allowGravity = false
      body.setVelocityY(0)
    }
  }

  updateAI(player: Phaser.Physics.Arcade.Sprite) {
    const playerX = player.x
    const toPlayer = playerX - this.x
    const distX = Math.abs(toPlayer)
    const playerNearGuardArea =
      Math.abs(playerX - this.guardCenterX) < this.chaseDistance * 0.45
    const playerVeryNearEnemy = this.shouldChase(distX)

    // Aggro only near this enemy's guard area, not across the map.
    if (playerNearGuardArea || playerVeryNearEnemy) {
      const dir = toPlayer >= 0 ? 1 : -1
      this.setVelocityX(dir * this.speed * 1.25)
      this.direction = dir
      // If we would go beyond the bridge bounds, immediately reflect.
      const vx = this.body?.velocity?.x
      if (this.x <= this.guardMinX && typeof vx === 'number' && vx < 0) {
        this.direction = 1
        this.setVelocityX(this.direction * this.speed * 0.5)
        this.x = this.guardMinX
      } else if (
        this.x >= this.guardMaxX &&
        typeof vx === 'number' &&
        vx > 0
      ) {
        this.direction = -1
        this.setVelocityX(this.direction * this.speed * 0.5)
        this.x = this.guardMaxX
      }
      return
    }

    // Guard patrol inside the exact bridge width bounds.
    if (this.x <= this.guardMinX) this.direction = 1
    if (this.x >= this.guardMaxX) this.direction = -1
    this.setVelocityX(this.direction * this.speed * 0.5)
  }

  private shouldChase(distanceX: number) {
    // Hardcoded mapping keeps behavior simple while still feeling “config-aware”.
    switch (this.enemyType) {
      case 'drones':
        return distanceX < this.chaseDistance
      case 'robots':
        return distanceX < this.chaseDistance * 0.9
      case 'aliens':
        return distanceX < this.chaseDistance * 1.05
      default:
        return distanceX < this.chaseDistance
    }
  }
}

