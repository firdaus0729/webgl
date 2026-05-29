import Phaser from 'phaser'

import {
  PLATFORMER_TEMPLATE_CONFIG,
  type PlatformerTemplateConfig,
  type QuestionBlockReward,
} from '../config'
import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { createSessionSeed } from '../sessionSeed'
import Player from '../objects/Player'
import Enemy from '../objects/Enemy'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'
import {
  createNintendoBackground,
  spawnDecorBlocks,
  type BackgroundLayers,
} from '../nintendo/BackgroundArt'
import {
  emitCoinSparkle,
  emitEnemyDefeat,
  emitLandDust,
  emitStompBounce,
  flagCelebration,
  screenShake,
  squashOnLand,
  stretchOnJump,
} from '../nintendo/GameJuice'
import { getNintendoPalette } from '../nintendo/NintendoPalette'
import { createNintendoTextures, type NintendoTextureKeys } from '../nintendo/SpriteFactory'
import { playSfx } from '../nintendo/ChiptuneAudio'

const HUD_FONT = '"Press Start 2P", "Courier New", monospace'
const PLATFORM_BASE_W = 48
const LEGACY_PLATFORM_W = 210
const COIN_VALUE = 100
const STOMP_SCORE = 200
const FIRE_SCORE = 150
const START_LIVES = 3
const INVINCIBLE_MS = 1200
const STAR_DURATION_MS = 10000

export default class MainScene extends Phaser.Scene {
  private player: Player | null = null
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private template: PlatformerTemplateConfig = PLATFORMER_TEMPLATE_CONFIG
  private baseTemplate: PlatformerTemplateConfig = PLATFORMER_TEMPLATE_CONFIG
  private enemies: Enemy[] = []
  private bullets!: Phaser.Physics.Arcade.Group
  private coins!: Phaser.Physics.Arcade.Group
  private flag!: Phaser.Physics.Arcade.Image
  private questionBlocks!: Phaser.Physics.Arcade.StaticGroup
  private pipes!: Phaser.Physics.Arcade.StaticGroup
  private checkpoints!: Phaser.Physics.Arcade.StaticGroup
  private powerUps!: Phaser.Physics.Arcade.Group
  private texKeys!: NintendoTextureKeys
  private bgLayers: BackgroundLayers | null = null
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private shootKey!: Phaser.Input.Keyboard.Key
  private pauseKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private jumpKey!: Phaser.Input.Keyboard.Key
  private downKey!: Phaser.Input.Keyboard.Key
  private lastShotAt = 0
  private lives = START_LIVES
  private coinsCollected = 0
  private totalCoins = 0
  private score = 0
  private spawnX = 0
  private spawnY = 0
  private checkpointX = 0
  private checkpointY = 0
  private checkpointActive = false
  private hasFlower = false
  private starUntil = 0
  private over = false
  private paused = false
  private invincibleUntil = 0
  private hudText: Phaser.GameObjects.Text | null = null
  private noticeText: Phaser.GameObjects.Text | null = null
  private restartKey!: Phaser.Input.Keyboard.Key
  private restartKeyHeld = false
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true
  private storedConfig: GameConfig | null = null
  private sessionSeed = ''
  private worldWidth = 0

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
    const heightScale = Math.max(0.25, this.scale.height / 540)
    this.template = {
      ...this.baseTemplate,
      player: {
        ...this.baseTemplate.player,
        jumpSpeed:
          this.baseTemplate.player.jumpSpeed * Math.sqrt(heightScale) * 0.98,
      },
    }

    this.physics.world.gravity.y = this.template.world.gravityY
    this.over = false
    this.paused = false
    this.lives = START_LIVES
    this.coinsCollected = 0
    this.score = 0
    this.lastShotAt = 0
    this.invincibleUntil = 0
    this.checkpointActive = false
    this.hasFlower = false
    this.starUntil = 0

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.shootKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    this.onGlobalRestartKeyDown = (e: KeyboardEvent) => {
      const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R'
      if (!isR || !this.over) return
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

    this.texKeys = createNintendoTextures(
      this,
      this.template.meta.theme,
      this.template.enemies.enemyType,
    )
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

  update(_time: number) {
    if (!this.player) return
    const now = this.time.now

    if (this.over) {
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
      if (this.paused) playSfx('pause')
      this.showNotice(this.paused ? '⏸ PAUSED' : '')
    }
    if (this.paused) return

    this.player.updateControls(
      this.cursors,
      {
        left: isCodeDown('KeyA') || this.leftKey.isDown || this.cursors.left.isDown,
        right: isCodeDown('KeyD') || this.rightKey.isDown || this.cursors.right.isDown,
        jump:
          isCodeDown('KeyW') ||
          this.jumpKey.isDown ||
          this.cursors.up.isDown ||
          this.cursors.space?.isDown,
      },
      now,
    )

    if (this.shootKey.isDown) this.tryShoot()
    for (const enemy of this.enemies) enemy.updateAI(this.player, now)

    this.tryPipeWarp()
    this.animateCoins(now)
    this.updateInvincibility(now)
    this.updateHud()
  }

  private platformScale(scaleX: number) {
    return scaleX * (LEGACY_PLATFORM_W / PLATFORM_BASE_W)
  }

  private platformWidth(scaleX: number) {
    return PLATFORM_BASE_W * this.platformScale(scaleX)
  }

  private createWorldAndBackground() {
    const w = this.scale.width
    const h = this.scale.height
    this.worldWidth = Math.floor(w * this.template.world.widthScale)
    this.physics.world.setBounds(0, 0, this.worldWidth, h)
    this.cameras.main.setBounds(0, 0, this.worldWidth, h)

    const pal = getNintendoPalette(this.template.meta.theme)
    this.cameras.main.setBackgroundColor(pal.skyTop)

    this.bgLayers = createNintendoBackground(this, this.template, this.worldWidth, h)
    spawnDecorBlocks(this, this.template, this.worldWidth, h)

    this.platforms = this.physics.add.staticGroup()
    const groundY = h - this.template.world.groundYOffsetRatio * h
    const groundScaleX = Math.max(1, this.worldWidth / 96)
    const ground = this.platforms
      .create(this.worldWidth / 2, groundY, this.texKeys.ground)
      .setScale(groundScaleX, 1)
    ground.refreshBody()

    for (const p of this.template.platforms.floating) {
      const plat = this.platforms.create(
        this.worldWidth * p.xRatio,
        groundY - p.yAboveGroundRatio * h,
        this.texKeys.platform,
      )
      plat.setScale(this.platformScale(p.scaleX), 1)
      plat.refreshBody()
    }

    const flagX = this.worldWidth - 50
    const flagY = groundY - 78
    this.flag = this.physics.add
      .staticImage(flagX, flagY, this.texKeys.flag)
      .setDepth(3)
      .setOrigin(0, 1) as Phaser.Physics.Arcade.Image

    this.createLevelElements(groundY, h)
  }

  private createLevelElements(groundY: number, h: number) {
    const elements = this.template.levelElements?.elements ?? []
    this.questionBlocks = this.physics.add.staticGroup()
    this.pipes = this.physics.add.staticGroup()
    this.checkpoints = this.physics.add.staticGroup()

    for (const el of elements) {
      if (el.type === 'question') {
        const block = this.questionBlocks.create(
          this.worldWidth * el.xRatio,
          groundY - el.yAboveGroundRatio * h - 16,
          this.texKeys.questionBlock,
        ) as Phaser.Physics.Arcade.Image
        block.setData('used', false)
        block.setData('reward', el.reward)
        block.setDepth(2)
        block.refreshBody()
      } else if (el.type === 'pipe') {
        const pipeH = el.heightRatio * h
        const pipe = this.pipes.create(
          this.worldWidth * el.xRatio,
          groundY - pipeH / 2,
          this.texKeys.pipe,
        ) as Phaser.Physics.Arcade.Image
        pipe.setScale(1, pipeH / 88)
        pipe.setOrigin(0.5, 0.5)
        pipe.setDepth(1)
        pipe.setData('warpToX', this.worldWidth * el.warpToXRatio)
        pipe.setData('lipY', groundY - pipeH + 4)
        pipe.refreshBody()
      } else if (el.type === 'checkpoint') {
        const cp = this.checkpoints.create(
          this.worldWidth * el.xRatio,
          groundY - 30,
          this.texKeys.checkpoint,
        ) as Phaser.Physics.Arcade.Image
        cp.setOrigin(0.5, 1)
        cp.setDepth(2)
        cp.setData('activated', false)
        cp.refreshBody()
      }
    }
  }

  private createPlayerAndSystems() {
    const pal = getNintendoPalette(this.template.meta.theme)
    this.spawnX = this.scale.width * this.template.player.spawnXRatio
    this.spawnY =
      this.scale.height - this.template.player.spawnBottomOffsetRatio * this.scale.height

    this.player = new Player(this, this.spawnX, this.spawnY, this.texKeys.hero, this.template)
    this.player.setScale(this.template.player.scale)
    this.player.setCallbacks({
      onLand: () => {
        if (!this.player) return
        emitLandDust(this, this.player.x, this.player.y + 20, pal, this.player.flipX)
        squashOnLand(this.player, this)
      },
      onJump: () => {
        if (!this.player) return
        playSfx('jump')
        stretchOnJump(this.player, this)
      },
    })
    this.physics.add.collider(this.player, this.platforms)

    if (this.questionBlocks) {
      this.physics.add.collider(this.player, this.questionBlocks, (playerObj, blockObj) => {
        const player = playerObj as Player
        const block = blockObj as Phaser.Physics.Arcade.Image
        if (block.getData('used')) return
        const body = player.body as Phaser.Physics.Arcade.Body | null
        if (!body || body.velocity.y >= -40) return
        const blockBottom = block.y + block.displayHeight * 0.45
        const playerTop = player.y - player.displayHeight * 0.42
        if (playerTop > blockBottom + 6) return
        this.onQuestionBlockHit(block, pal)
        body.setVelocityY(140)
      })
    }

    if (this.pipes) {
      this.physics.add.collider(this.player, this.pipes)
    }

    const lerp = this.template.camera.followLerp
    this.cameras.main.startFollow(this.player, true, lerp, lerp)
    this.cameras.main.setDeadzone(80, 40)

    this.enemies = []
    const h = this.scale.height
    const groundY = h - this.template.world.groundYOffsetRatio * h

    for (const s of this.template.enemies.spawn) {
      const bridge = this.template.platforms.floating[s.bridgeIndex]
      if (!bridge) continue
      const bridgeWidthPx = this.platformWidth(bridge.scaleX)
      const bridgeCenterX = this.worldWidth * bridge.xRatio
      const bridgeCenterY = groundY - bridge.yAboveGroundRatio * h
      const platformHeightPx = 18
      const enemyHeightPx = 36
      const enemyY = bridgeCenterY - (platformHeightPx + enemyHeightPx) / 2
      const edgeInsetPx = 12
      const minX = bridgeCenterX - bridgeWidthPx / 2 + edgeInsetPx
      const maxX = bridgeCenterX + bridgeWidthPx / 2 - edgeInsetPx
      const enemy = new Enemy(
        this,
        this.worldWidth * s.xRatio,
        enemyY,
        this.texKeys.enemy,
        this.template,
        s.direction,
        { minX, maxX },
      )
      enemy.setScale(1.1)
      this.enemies.push(enemy)
    }

    this.bullets = this.physics.add.group({ maxSize: 32 })
    this.physics.add.collider(this.bullets, this.platforms, (obj) =>
      (obj as Phaser.Physics.Arcade.Image).disableBody(true, true),
    )

    this.powerUps = this.physics.add.group({ allowGravity: true, maxSize: 16 })
    this.physics.add.collider(this.powerUps, this.platforms)
    this.physics.add.overlap(this.player, this.powerUps, (_player, pu) => {
      this.collectPowerUp(pu as Phaser.Physics.Arcade.Image)
    })

    if (this.checkpoints) {
      this.physics.add.overlap(this.player, this.checkpoints, (_player, cpObj) => {
        const cp = cpObj as Phaser.Physics.Arcade.Image
        if (cp.getData('activated')) return
        cp.setData('activated', true)
        cp.setTexture(this.texKeys.checkpointActive)
        this.checkpointActive = true
        this.checkpointX = cp.x
        this.checkpointY = cp.y - 36
        playSfx('checkpoint')
        this.showNotice('✓ CHECKPOINT!')
        this.time.delayedCall(1200, () => {
          if (!this.over) this.showNotice('')
        })
      })
    }

    this.coins = this.physics.add.group({ allowGravity: false })
    const coinCount = Math.max(3, this.template.platforms.floating.length + 2)
    this.totalCoins = coinCount
    const floating = this.template.platforms.floating.length
      ? this.template.platforms.floating
      : [{ xRatio: 0.5, yAboveGroundRatio: 110 / 540, scaleX: 0.8 }]

    for (let i = 0; i < coinCount; i++) {
      const p = floating[i % floating.length]
      const cx = this.worldWidth * p.xRatio + ((i % 3) - 1) * 18
      const cy = groundY - p.yAboveGroundRatio * h - 36
      const coin = this.coins.create(cx, cy, this.texKeys.coin) as Phaser.Physics.Arcade.Image
      coin.setData('spinPhase', i * 0.7)
    }

    this.physics.add.overlap(this.player, this.coins, (_player, token) => {
      const coin = token as Phaser.Physics.Arcade.Image
      if (!coin.active) return
      coin.disableBody(true, true)
      this.coinsCollected++
      this.score += COIN_VALUE
      emitCoinSparkle(this, coin.x, coin.y, pal)
    })

    this.physics.add.overlap(this.player, this.flag, () => {
      if (this.over) return
      this.win()
    })

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      const bullet = b as Phaser.Physics.Arcade.Image
      const enemy = e as Enemy
      if (enemy.isDead()) return
      bullet.disableBody(true, true)
      enemy.defeat()
      this.enemies = this.enemies.filter((x) => x.active)
      this.score += FIRE_SCORE
      emitEnemyDefeat(this, enemy.x, enemy.y, pal)
    })

    this.physics.add.collider(this.player, this.enemies, () => {
      if (this.over || !this.player) return
      const enemy = this.enemies.find(
        (en) =>
          en.active &&
          !en.isDead() &&
          Math.abs(en.x - this.player!.x) < en.displayWidth * 0.6,
      )
      if (!enemy) return

      if (this.time.now < this.starUntil) {
        enemy.defeat()
        this.score += STOMP_SCORE
        emitEnemyDefeat(this, enemy.x, enemy.y, pal)
        this.enemies = this.enemies.filter((x) => x.active)
        return
      }

      if (enemy.tryStomp(this.player)) {
        this.score += STOMP_SCORE
        emitEnemyDefeat(this, enemy.x, enemy.y, pal)
        emitStompBounce(this, this.player)
        this.enemies = this.enemies.filter((x) => x.active)
        return
      }

      if (this.time.now < this.invincibleUntil) return
      this.takeDamage()
    })
  }

  private onQuestionBlockHit(block: Phaser.Physics.Arcade.Image, pal: ReturnType<typeof getNintendoPalette>) {
    playSfx('blockHit')
    block.setData('used', true)
    block.setTexture(this.texKeys.questionBlockUsed)
    this.tweens.add({
      targets: block,
      y: block.y - 10,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
    })

    const reward = block.getData('reward') as QuestionBlockReward
    if (reward === 'coin') {
      this.coinsCollected++
      this.totalCoins++
      this.score += COIN_VALUE
      emitCoinSparkle(this, block.x, block.y - 18, pal)
      return
    }
    this.spawnPowerUpFromBlock(block.x, block.y - 28, reward)
  }

  private spawnPowerUpFromBlock(x: number, y: number, reward: QuestionBlockReward) {
    const tex =
      reward === 'flower'
        ? this.texKeys.flower
        : reward === 'star'
          ? this.texKeys.star
          : this.texKeys.mushroom
    const pu = this.powerUps.create(x, y, tex) as Phaser.Physics.Arcade.Image
    if (!pu) return
    pu.setData('reward', reward)
    pu.setDepth(6)
    pu.setVelocity(reward === 'mushroom' || reward === '1up' ? 75 : 0, -200)
    pu.setBounce(0.35)
    pu.setCollideWorldBounds(true)
    this.time.delayedCall(500, () => {
      if (pu.active && (reward === 'mushroom' || reward === '1up')) {
        pu.setVelocityX(75)
      }
    })
  }

  private collectPowerUp(pu: Phaser.Physics.Arcade.Image) {
    if (!pu.active) return
    const reward = pu.getData('reward') as QuestionBlockReward
    pu.disableBody(true, true)
    playSfx('powerUp')

    switch (reward) {
      case 'mushroom':
        this.lives++
        this.showNotice('🍄 1 UP!')
        break
      case '1up':
        this.lives++
        this.showNotice('🍄 EXTRA LIFE!')
        break
      case 'flower':
        this.hasFlower = true
        if (this.player) this.player.setTint(0xffcc88)
        this.showNotice('🌸 FIRE POWER!')
        break
      case 'star':
        this.starUntil = this.time.now + STAR_DURATION_MS
        this.showNotice('⭐ STAR POWER!')
        break
      default:
        break
    }
    this.time.delayedCall(1100, () => {
      if (!this.over) this.showNotice('')
    })
  }

  private tryPipeWarp() {
    if (!this.player || this.over) return
    const down =
      this.downKey.isDown ||
      this.cursors.down.isDown ||
      isCodeDown('KeyS')
    if (!down) return

    const body = this.player.body as Phaser.Physics.Arcade.Body | null
    if (!body) return

    for (const child of this.pipes.getChildren()) {
      const pipe = child as Phaser.Physics.Arcade.Image
      const lipY = pipe.getData('lipY') as number
      const warpX = pipe.getData('warpToX') as number
      const dx = Math.abs(this.player.x - pipe.x)
      const onTop = this.player.y <= lipY + 8 && this.player.y >= lipY - 40
      if (dx > 34 || !onTop) continue
      if (!body.blocked.down && !body.touching.down) continue

      this.player.setPosition(warpX, lipY - 8)
      this.player.setVelocity(0, 0)
      playSfx('powerUp')
      this.cameras.main.flash(120, 200, 255, 200, false)
      this.showNotice('🟢 WARP!')
      this.time.delayedCall(700, () => {
        if (!this.over) this.showNotice('')
      })
      break
    }
  }

  private respawnPlayer() {
    if (!this.player) return
    const x = this.checkpointActive ? this.checkpointX : this.spawnX
    const y = this.checkpointActive ? this.checkpointY : this.spawnY
    this.player.setPosition(x, y)
    this.player.setVelocity(0, 0)
    this.invincibleUntil = this.time.now + INVINCIBLE_MS * 2
    this.hasFlower = false
    this.player.clearTint()
    this.player.setAlpha(1)
  }

  private takeDamage() {
    if (!this.player || this.over) return
    if (this.time.now < this.starUntil) return

    this.lives--
    playSfx('hurt')
    screenShake(this, 0.006, 120)

    if (this.lives <= 0) {
      this.lose()
      return
    }

    this.respawnPlayer()
    this.showNotice(`OUCH! ♥×${this.lives}`)
    this.time.delayedCall(800, () => {
      if (!this.over) this.showNotice('')
    })
  }

  private updateInvincibility(now: number) {
    if (!this.player) return

    if (now < this.starUntil) {
      const colors = [0xffff00, 0xff8800, 0xff0088, 0x00ffff]
      this.player.setTint(colors[Math.floor(now / 80) % colors.length])
      this.player.setAlpha(1)
      return
    }

    if (now >= this.invincibleUntil) {
      this.player.clearTint()
      if (this.hasFlower) this.player.setTint(0xffcc88)
      this.player.setAlpha(1)
      return
    }
    this.player.setAlpha(Math.sin(now * 0.02) > 0 ? 1 : 0.45)
  }

  private animateCoins(time: number) {
    this.coins.getChildren().forEach((child) => {
      const coin = child as Phaser.Physics.Arcade.Image
      if (!coin.active) return
      const phase = (coin.getData('spinPhase') as number) ?? 0
      const scaleX = 0.6 + Math.abs(Math.sin(time * 0.006 + phase)) * 0.5
      coin.setScale(scaleX, 1)
      coin.y += Math.sin(time * 0.004 + phase) * 0.15
    })
  }

  private tryShoot() {
    const baseCd = this.template.sessionVariant?.bulletCooldownMs ?? 220
    const cd = this.hasFlower ? baseCd * 0.5 : baseCd
    if (!this.player || this.time.now - this.lastShotAt < cd) return
    this.lastShotAt = this.time.now
    playSfx('shoot')
    const bullet = this.bullets.get(
      this.player.x,
      this.player.y - 4,
      this.texKeys.fireball,
    ) as Phaser.Physics.Arcade.Image | null
    if (!bullet) return
    bullet.enableBody(true, this.player.x, this.player.y - 4, true, true)
    bullet.setActive(true).setVisible(true).setDepth(7).setScale(this.hasFlower ? 1.45 : 1.2)
    const vx = this.template.sessionVariant?.bulletSpeedX ?? 520
    bullet.setVelocityX(this.player.flipX ? -vx : vx)
    bullet.setVelocityY(-40)
    this.time.delayedCall(1400, () => bullet.active && bullet.disableBody(true, true))
  }

  private createHud() {
    const pal = getNintendoPalette(this.template.meta.theme)

    this.hudText = this.add
      .text(12, 10, '', {
        fontFamily: HUD_FONT,
        fontSize: '11px',
        color: pal.hudText,
        lineSpacing: 8,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setDepth(30)
      .setScrollFactor(0)

    this.noticeText = this.add
      .text(this.scale.width / 2, this.scale.height * 0.38, '', {
        fontFamily: HUD_FONT,
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setScrollFactor(0)

    this.updateHud()
  }

  private updateHud() {
    if (!this.hudText) return
    const world = this.template.meta.theme.toUpperCase().slice(0, 3)
    const enemiesLeft = this.enemies.filter((e) => e.active && !e.isDead()).length

    const starTag = this.time.now < this.starUntil ? ' ⭐' : this.hasFlower ? ' 🌸' : ''
    const cpTag = this.checkpointActive ? ' ✓CP' : ''

    this.hudText.setText(
      [
        `🪙 ${String(this.coinsCollected).padStart(2, '0')}/${String(this.totalCoins).padStart(2, '0')}   ★ ${this.score}`,
        `♥ ×${this.lives}   👾 ${enemiesLeft}   ${world}-1${cpTag}${starTag}`,
        'Move/Jump · J Fire · ? Blocks · S+Pipe · → Flag',
      ].join('\n'),
    )
  }

  private win() {
    this.over = true
    this.physics.world.isPaused = true
    flagCelebration(this, this.flag.x, this.flag.y)
    this.showNotice('🚩 WORLD CLEAR!\nPRESS R TO PLAY AGAIN')
  }

  private lose() {
    this.over = true
    this.physics.world.isPaused = true
    playSfx('lose')
    this.showNotice('💀 GAME OVER\nPRESS R TO RETRY')
  }

  private showNotice(text: string) {
    if (this.noticeText) this.noticeText.setText(text)
  }
}
