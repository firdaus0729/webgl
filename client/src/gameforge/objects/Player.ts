import Phaser from 'phaser'

import type { PlatformerTemplateConfig } from '../config'

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed: number
  private jumpSpeed: number
  private readonly keys: {
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    jump: Phaser.Input.Keyboard.Key
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    template: PlatformerTemplateConfig,
  ) {
    super(scene, x, y, textureKey)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(5)
    this.setCollideWorldBounds(true)
    this.setMaxVelocity(450, 2000)
    this.setDragX(800)
    this.setBodySize(this.width * 0.6, this.height, true)

    this.moveSpeed = template.player.moveSpeed
    this.jumpSpeed = template.player.jumpSpeed

    const keyboard = scene.input.keyboard
    if (!keyboard) {
      // Phaser's keyboard plugin should exist, but we guard for type-safety.
      throw new Error('Keyboard not available')
    }
    this.keys = {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    }
  }

  updateControls(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    extra?: { left?: boolean; right?: boolean; jump?: boolean },
  ) {
    const leftDown =
      this.keys.left.isDown || cursors.left.isDown === true || extra?.left === true
    const rightDown =
      this.keys.right.isDown || cursors.right.isDown === true || extra?.right === true

    if (leftDown) this.setVelocityX(-this.moveSpeed)
    else if (rightDown) this.setVelocityX(this.moveSpeed)
    else this.setVelocityX(0)

    if (leftDown) this.setFlipX(true)
    if (rightDown) this.setFlipX(false)

    const body = this.body
    if (!body) return
    const onGround = body.blocked.down || body.touching.down
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(cursors.space) ||
      extra?.jump === true

    if (onGround && jumpPressed) {
      this.setVelocityY(-this.jumpSpeed)
    }
  }
}

