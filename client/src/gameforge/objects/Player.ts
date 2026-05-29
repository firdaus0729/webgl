import Phaser from 'phaser'

import type { PlatformerTemplateConfig } from '../config'

const COYOTE_MS = 130
const JUMP_BUFFER_MS = 110
const JUMP_CUT = 0.46
const ACCEL = 2200
const DECEL = 2800
const MAX_SPEED_MUL = 1.05

export type PlayerCallbacks = {
  onLand?: () => void
  onJump?: () => void
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private moveSpeed: number
  private jumpSpeed: number
  private readonly keys: {
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
    jump: Phaser.Input.Keyboard.Key
  }
  private coyoteUntil = 0
  private jumpBufferUntil = 0
  private wasOnGround = false
  private jumpHeld = false
  private callbacks: PlayerCallbacks = {}
  private baseScaleX = 1
  private baseScaleY = 1

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

    this.moveSpeed = template.player.moveSpeed
    this.jumpSpeed = template.player.jumpSpeed

    this.setDepth(5)
    this.setCollideWorldBounds(true)
    this.setMaxVelocity(this.moveSpeed * MAX_SPEED_MUL, 2000)
    this.setDragX(0)
    this.setBodySize(this.width * 0.55, this.height * 0.92, true)
    this.baseScaleX = template.player.scale
    this.baseScaleY = template.player.scale

    const keyboard = scene.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard not available')
    }
    this.keys = {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
    }
  }

  setCallbacks(callbacks: PlayerCallbacks) {
    this.callbacks = callbacks
  }

  /** Classic Mario stomp bounce after defeating an enemy. */
  stompBounce() {
    this.setVelocityY(-this.jumpSpeed * 0.72)
  }

  updateControls(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    extra?: { left?: boolean; right?: boolean; jump?: boolean },
    now = 0,
  ) {
    const body = this.body as Phaser.Physics.Arcade.Body | null
    if (!body) return

    const leftDown =
      this.keys.left.isDown || cursors.left.isDown === true || extra?.left === true
    const rightDown =
      this.keys.right.isDown || cursors.right.isDown === true || extra?.right === true
    const jumpDown =
      this.keys.jump.isDown ||
      cursors.space?.isDown === true ||
      cursors.up?.isDown === true ||
      extra?.jump === true

    const onGround = body.blocked.down || body.touching.down
    const time = now || this.scene.time.now

    if (onGround) {
      this.coyoteUntil = time + COYOTE_MS
    } else if (this.wasOnGround && !onGround) {
      this.coyoteUntil = time + COYOTE_MS
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.jump) || extra?.jump === true) {
      this.jumpBufferUntil = time + JUMP_BUFFER_MS
    }
    if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
      this.jumpBufferUntil = time + JUMP_BUFFER_MS
    }
    if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
      this.jumpBufferUntil = time + JUMP_BUFFER_MS
    }

    const vx = body.velocity.x
    if (leftDown) {
      const target = -this.moveSpeed
      body.setVelocityX(Phaser.Math.Linear(vx, target, Math.min(1, (ACCEL * 0.016) / this.moveSpeed)))
      this.setFlipX(true)
    } else if (rightDown) {
      const target = this.moveSpeed
      body.setVelocityX(Phaser.Math.Linear(vx, target, Math.min(1, (ACCEL * 0.016) / this.moveSpeed)))
      this.setFlipX(false)
    } else {
      const decel = DECEL * 0.016
      if (Math.abs(vx) <= decel) body.setVelocityX(0)
      else body.setVelocityX(vx - Math.sign(vx) * decel)
    }

    const canJump = onGround || time < this.coyoteUntil
    const wantsJump = time < this.jumpBufferUntil

    if (canJump && wantsJump && !this.jumpHeld) {
      body.setVelocityY(-this.jumpSpeed)
      this.jumpBufferUntil = 0
      this.coyoteUntil = 0
      this.jumpHeld = true
      this.callbacks.onJump?.()
    }

    if (!jumpDown && this.jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * JUMP_CUT)
      this.jumpHeld = false
    }
    if (!jumpDown) this.jumpHeld = false
    if (jumpDown) this.jumpHeld = true

    if (onGround && !this.wasOnGround) {
      this.callbacks.onLand?.()
    }
    this.wasOnGround = onGround
  }
}
