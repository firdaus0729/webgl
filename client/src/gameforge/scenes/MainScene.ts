import Phaser from 'phaser'

import {
  PLATFORMER_TEMPLATE_CONFIG,
  type PlatformerTemplateConfig,
} from '../config'
import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { createSessionSeed } from '../sessionSeed'
import Player from '../objects/Player'
import Enemy from '../objects/Enemy'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'

const HUD_FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

export default class MainScene extends Phaser.Scene {
  private player: Player | null = null
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private template: PlatformerTemplateConfig = PLATFORMER_TEMPLATE_CONFIG
  private baseTemplate: PlatformerTemplateConfig = PLATFORMER_TEMPLATE_CONFIG
  private enemies: Enemy[] = []
  private bullets!: Phaser.Physics.Arcade.Group
  private relics!: Phaser.Physics.Arcade.Group
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private shootKey!: Phaser.Input.Keyboard.Key
  private pauseKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private jumpKey!: Phaser.Input.Keyboard.Key
  private skyLayers: Phaser.GameObjects.TileSprite[] = []
  private lastShotAt = 0
  private health = 100
  private score = 0
  private remainingRelics = 0
  private totalRelics = 0
  private over = false
  private paused = false
  private hudText: Phaser.GameObjects.Text | null = null
  private noticeText: Phaser.GameObjects.Text | null = null
  private hudChrome: Phaser.GameObjects.Graphics | null = null
  private restartListenerAdded = false
  private restartKey!: Phaser.Input.Keyboard.Key
  private restartKeyHeld = false
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true
  private storedConfig: GameConfig | null = null
  private sessionSeed = ''

  constructor() {
    super('MainScene')
  }

  private restartPayload() {
    return this.storedConfig
      ? { config: this.storedConfig, sessionSeed: this.sessionSeed }
      : { template: this.baseTemplate }
  }

  init(data?: {
    template?: PlatformerTemplateConfig
    config?: GameConfig
    sessionSeed?: string
  }) {
    this.storedConfig = data?.config ?? null
    if (data?.config) {
      const seed = data.sessionSeed ?? (this.sessionSeed || createSessionSeed())
      this.sessionSeed = seed
      this.baseTemplate = buildPlatformerTemplateFromConfig(data.config, seed)
    } else {
      this.baseTemplate = data?.template ?? PLATFORMER_TEMPLATE_CONFIG
    }
    this.template = this.baseTemplate
  }

  create() {
    // The original gameplay tuning in frontend assumed a fixed 960x540 canvas.
    // In igraverse we render the game full-screen, so vertical distances scale with
    // the Phaser height. To keep jump reach consistent, scale jump speed by
    // sqrt(height / 540).
    const heightScale = Math.max(0.25, this.scale.height / 540)
    const jumpTuningMultiplier = 0.95
    this.template = {
      ...this.baseTemplate,
      player: {
        ...this.baseTemplate.player,
        jumpSpeed:
          this.baseTemplate.player.jumpSpeed * Math.sqrt(heightScale) * jumpTuningMultiplier,
      },
    }

    this.physics.world.gravity.y = this.template.world.gravityY
    this.over = false
    this.paused = false
    this.health = 100
    this.score = 0
    this.lastShotAt = 0

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.shootKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    // Extra reliability: if Phaser's keyboard state is disrupted (fullscreen/pointer lock),
    // listen directly to DOM key events for R/r and restart.
    this.onGlobalRestartKeyDown = (e: KeyboardEvent) => {
      const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R'
      if (!isR) return
      if (!this.over) return
      // Prevent multiple restarts from key auto-repeat.
      if (this.restartKeyHeld) return
      this.restartKeyHeld = true
      this.scene.restart(this.restartPayload())
    }
    this.onGlobalRestartKeyUp = (e: KeyboardEvent) => {
      const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R'
      if (!isR) return
      this.restartKeyHeld = false
    }
    window.addEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
    window.addEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)

    this.createTextures()
    this.createWorldAndBackground()
    this.createPlayerAndSystems()
    this.createHud()
    attachGlobalInput()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      detachGlobalInput()
      window.removeEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
      window.removeEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)
    })
  }

  update() {
    if (!this.player) return
    if (this.over) {
      // Restart reliability: allow both R press and R-hold after win/lose.
      const isDown = this.restartKey?.isDown === true
      if (isDown && !this.restartKeyHeld) {
        this.scene.restart(this.restartPayload())
      }
      this.restartKeyHeld = isDown
      return
    }
    this.restartKeyHeld = false
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.paused = !this.paused
      this.physics.world.isPaused = this.paused
      this.showNotice(this.paused ? 'PAUSED' : '')
    }
    if (this.paused) return

    this.player.updateControls(this.cursors, {
      left:
        isCodeDown('KeyA') ||
        this.leftKey.isDown ||
        this.cursors.left.isDown,
      right:
        isCodeDown('KeyD') ||
        this.rightKey.isDown ||
        this.cursors.right.isDown,
      jump:
        isCodeDown('KeyW') ||
        this.jumpKey.isDown ||
        this.cursors.up.isDown,
    })
    if (this.shootKey.isDown) this.tryShoot()
    for (const enemy of this.enemies) enemy.updateAI(this.player)
    this.scrollBackground()
    this.updateHud()
    this.checkResult()
  }

  private createTextures() {
    const g = this.make.graphics({ x: 0, y: 0 })
    const tc = this.template.theme

    g.fillGradientStyle(
      tc.playerFill,
      tc.playerFill,
      tc.playerStroke,
      tc.playerStroke,
      1,
    )
    g.fillRoundedRect(0, 0, 38, 58, 10)
    g.fillStyle(0xfff7df, 1)
    g.fillCircle(19, 16, 10)
    g.fillStyle(0x1d1d1d, 0.75)
    g.fillRoundedRect(12, 28, 14, 20, 5)
    g.lineStyle(2, tc.platformStroke, 0.8)
    g.strokeRoundedRect(0, 0, 38, 58, 10)
    g.generateTexture('heroTex', 38, 58)

    g.clear()
    g.fillGradientStyle(tc.platformFill, tc.platformFill, 0x202028, 0x202028, 1)
    g.fillRoundedRect(0, 0, 210, 28, 9)
    g.fillStyle(0xffffff, 0.12)
    g.fillRoundedRect(8, 4, 190, 4, 3)
    g.generateTexture('platformNeoTex', 210, 28)

    g.clear()
    if (this.template.enemies.enemyType === 'robots') {
      g.fillStyle(0x9aa0ad, 1)
      g.fillRoundedRect(6, 8, 30, 32, 8)
      g.fillStyle(0x40ffd9, 1)
      g.fillRoundedRect(13, 18, 8, 4, 2)
      g.fillRoundedRect(22, 18, 8, 4, 2)
    } else if (this.template.enemies.enemyType === 'aliens') {
      g.fillStyle(0x9d5cff, 1)
      g.fillEllipse(21, 23, 30, 34)
      g.fillStyle(0xe3fffa, 1)
      g.fillCircle(15, 20, 3)
      g.fillCircle(27, 20, 3)
    } else {
      g.fillStyle(0xff5e72, 1)
      g.fillCircle(21, 21, 16)
      g.fillStyle(0x1df5ff, 1)
      g.fillCircle(21, 21, 5)
    }
    g.lineStyle(2, 0xffffff, 0.3)
    g.strokeRoundedRect(4, 6, 34, 36, 7)
    g.generateTexture('foeTex', 42, 44)

    g.clear()
    g.fillStyle(0xffffff, 0.92)
    g.fillRoundedRect(0, 0, 24, 6, 3)
    g.generateTexture('shotTex', 24, 6)

    g.clear()
    g.fillStyle(0xffd95e, 1)
    g.fillCircle(12, 12, 10)
    g.lineStyle(2, 0xfffbde, 1)
    g.strokeCircle(12, 12, 10)
    g.generateTexture('relicTex', 24, 24)
    g.destroy()
  }

  private createWorldAndBackground() {
    const w = this.scale.width
    const h = this.scale.height
    const worldWidth = Math.floor(w * this.template.world.widthScale)
    this.physics.world.setBounds(0, 0, worldWidth, h)
    this.cameras.main.setBounds(0, 0, worldWidth, h)
    this.cameras.main.setBackgroundColor(this.template.theme.backgroundColor)

    this.drawSkyArt(worldWidth, h)

    this.platforms = this.physics.add.staticGroup()
    const groundY = h - this.template.world.groundYOffsetRatio * h
    const groundScaleX = Math.max(1, worldWidth / 210)
    const ground = this.platforms
      .create(worldWidth / 2, groundY, 'platformNeoTex')
      .setScale(groundScaleX, 1)
    ground.refreshBody()

    for (const p of this.template.platforms.floating) {
      const plat = this.platforms.create(
        worldWidth * p.xRatio,
        groundY - p.yAboveGroundRatio * h,
        'platformNeoTex',
      )
      plat.setScale(p.scaleX, 1)
      plat.refreshBody()
    }
  }

  private drawSkyArt(worldWidth: number, h: number) {
    const back = this.add
      .tileSprite(worldWidth / 2, h / 2, worldWidth, h, '__WHITE')
      .setTint(0x0f1222)
      .setAlpha(0.5)
    const mid = this.add
      .tileSprite(worldWidth / 2, h / 2, worldWidth, h, '__WHITE')
      .setTint(0x1d2e4a)
      .setAlpha(0.23)
    const front = this.add
      .tileSprite(worldWidth / 2, h / 2, worldWidth, h, '__WHITE')
      .setTint(0x3a5a78)
      .setAlpha(0.14)
    this.skyLayers = [back, mid, front]

    for (let i = 0; i < 140; i++) {
      this.add.circle(
        Phaser.Math.Between(0, worldWidth),
        Phaser.Math.Between(0, h - 100),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.12, 0.7),
      )
    }
  }

  private createPlayerAndSystems() {
    const spawnX = this.scale.width * this.template.player.spawnXRatio
    const spawnY =
      this.scale.height - this.template.player.spawnBottomOffsetRatio * this.scale.height
    this.player = new Player(this, spawnX, spawnY, 'heroTex', this.template)
    this.player.setScale(this.template.player.scale)
    this.player.setBodySize(this.player.width * 0.72, this.player.height, true)
    this.physics.add.collider(this.player, this.platforms)

    const lerp = this.template.camera.followLerp
    this.cameras.main.startFollow(this.player, true, lerp, lerp)

    this.enemies = []
    const h = this.scale.height
    const groundY = h - this.template.world.groundYOffsetRatio * h
    const worldWidth = this.physics.world.bounds.width
    for (const s of this.template.enemies.spawn) {
      const bridgeIndex = s.bridgeIndex
      const bridge = this.template.platforms.floating[bridgeIndex]
      if (!bridge) continue
      const bridgeWidthPx = 210 * bridge.scaleX
      const bridgeCenterX = worldWidth * bridge.xRatio
      const bridgeCenterY = groundY - bridge.yAboveGroundRatio * h
      // Texture sizes in pixels (before scaling): platformNeoTex is 210x28, foeTex is 42x44.
      // Enemies must visually sit on top of the bridge, and must not fall (gravity disabled).
      const platformHeightPx = 28
      const enemyHeightPx = 44
      const enemyY = bridgeCenterY - (platformHeightPx + enemyHeightPx) / 2
      // Keep enemies slightly away from bridge edges to avoid clipping/falling.
      const edgeInsetPx = 14
      const minX = bridgeCenterX - bridgeWidthPx / 2 + edgeInsetPx
      const maxX = bridgeCenterX + bridgeWidthPx / 2 - edgeInsetPx
      const enemy = new Enemy(
        this,
        worldWidth * s.xRatio,
        enemyY,
        'foeTex',
        this.template,
        s.direction,
        { minX, maxX },
      )
      this.enemies.push(enemy)
    }

    this.bullets = this.physics.add.group({ maxSize: 48 })
    this.physics.add.collider(
      this.bullets,
      this.platforms,
      (obj) => (obj as Phaser.Physics.Arcade.Image).disableBody(true, true),
    )

    this.relics = this.physics.add.group({ allowGravity: true })
    const relicCount = Math.max(1, this.template.platforms.floating.length)
    this.remainingRelics = relicCount
    this.totalRelics = relicCount
    const floating =
      this.template.platforms.floating.length
        ? this.template.platforms.floating
        : [{ xRatio: 0.5, yAboveGroundRatio: 110 / 540, scaleX: 0.8 }]
    for (let i = 0; i < relicCount; i++) {
      const p = floating[i % floating.length]
      this.relics.create(
        this.physics.world.bounds.width * p.xRatio,
        groundY - p.yAboveGroundRatio * h - 44,
        'relicTex',
      )
    }
    this.physics.add.collider(this.relics, this.platforms)

    this.physics.add.overlap(this.player, this.relics, (_player, token) => {
      ;(token as Phaser.Physics.Arcade.Image).disableBody(true, true)
      this.remainingRelics = Math.max(0, this.remainingRelics - 1)
      this.score += 120
    })

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      ;(b as Phaser.Physics.Arcade.Image).disableBody(true, true)
      ;(e as Enemy).destroy()
      this.enemies = this.enemies.filter((x) => x.active)
      this.score += 180
    })

    this.physics.add.collider(this.player, this.enemies, () => {
      if (this.over) return
      // Platformer failure condition: touching a guarding enemy kills player.
      this.health = 0
      this.cameras.main.shake(100, 0.0032)
      this.lose()
    })
  }

  private tryShoot() {
    if (!this.player || this.time.now - this.lastShotAt < 160) return
    this.lastShotAt = this.time.now
    const bullet = this.bullets.get(
      this.player.x,
      this.player.y - 2,
      'shotTex',
    ) as Phaser.Physics.Arcade.Image | null
    if (!bullet) return
    bullet.enableBody(true, this.player.x, this.player.y - 2, true, true)
    bullet.setActive(true).setVisible(true).setDepth(7)
    bullet.setVelocityX(this.player.flipX ? -640 : 640)
    this.time.delayedCall(1200, () => bullet.active && bullet.disableBody(true, true))
  }

  private createHud() {
    const hud = this.add.graphics().setDepth(28).setScrollFactor(0)
    hud.fillStyle(0x060a14, 0.62)
    hud.fillRoundedRect(10, 10, 432, 88, 12)
    hud.lineStyle(1, 0x5cd9ff, 0.45)
    hud.strokeRoundedRect(10, 10, 432, 88, 12)
    hud.fillStyle(0xffffff, 0.08)
    hud.fillRect(24, 56, 180, 8)
    hud.fillRect(24, 76, 180, 8)
    this.hudChrome = hud

    this.hudText = this.add
      .text(16, 16, '', {
        fontFamily: HUD_FONT,
        fontSize: '13px',
        color: '#e6edf7',
        lineSpacing: 4,
      })
      .setDepth(30)
      .setScrollFactor(0)
    this.noticeText = this.add
      .text(this.scale.width / 2, 18, '', {
        fontFamily: HUD_FONT,
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)
      .setDepth(32)
      .setScrollFactor(0)
    this.updateHud()
  }

  private updateHud() {
    if (!this.hudText) return
    const alive = this.enemies.filter((e) => e.active).length
    const hpNorm = Phaser.Math.Clamp(this.health / 100, 0, 1)
    const progressNorm =
      1 -
      Phaser.Math.Clamp(
        (alive + this.remainingRelics) /
          Math.max(1, this.template.enemies.spawn.length + this.totalRelics),
        0,
        1,
      )

    if (this.hudChrome) {
      this.hudChrome.clear()
      this.hudChrome.fillStyle(0x060a14, 0.62)
      this.hudChrome.fillRoundedRect(10, 10, 432, 88, 12)
      this.hudChrome.lineStyle(1, 0x5cd9ff, 0.45)
      this.hudChrome.strokeRoundedRect(10, 10, 432, 88, 12)
      this.hudChrome.fillStyle(0xffffff, 0.08)
      this.hudChrome.fillRect(24, 56, 180, 8)
      this.hudChrome.fillRect(24, 76, 180, 8)
      this.hudChrome.fillStyle(0x3bff8f, 0.92)
      this.hudChrome.fillRect(24, 56, 180 * hpNorm, 8)
      this.hudChrome.fillStyle(0x59d7ff, 0.92)
      this.hudChrome.fillRect(24, 76, 180 * progressNorm, 8)
    }

    this.hudText.setText(
      [
        `SCORE ${this.score}   HP ${this.health}`,
        `ENEMIES ${alive}   RELICS ${this.remainingRelics}`,
        `MODE PLATFORMER   THEME ${this.template.meta.theme.toUpperCase()}`,
        'Keyboard: WASD Move/Jump, J Shoot | P Pause',
      ].join('\n'),
    )
  }

  private scrollBackground() {
    const sx = this.cameras.main.scrollX
    if (this.skyLayers[0]) this.skyLayers[0].tilePositionX = sx * 0.06
    if (this.skyLayers[1]) this.skyLayers[1].tilePositionX = sx * 0.12
    if (this.skyLayers[2]) this.skyLayers[2].tilePositionX = sx * 0.2
  }

  private checkResult() {
    // Platformer win condition: collect all money/relics.
    if (this.remainingRelics === 0) this.win()
  }

  private win() {
    this.over = true
    this.physics.world.isPaused = true
    this.showNotice('VICTORY // PRESS R TO RESTART')
    this.enableRestart()
  }

  private lose() {
    this.over = true
    this.physics.world.isPaused = true
    this.showNotice('DEFEAT // PRESS R TO RETRY')
    this.enableRestart()
  }

  private showNotice(text: string) {
    if (this.noticeText) this.noticeText.setText(text)
  }

  private enableRestart() {
    // No-op: restart is handled in `update()` for reliability.
    // Kept only so win/lose can call enableRestart() without refactoring.
    this.restartListenerAdded = true
  }

  // Mouse/touch/tilt input intentionally removed: keyboard-only gameplay.
}

