import Phaser from 'phaser'

import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'
import { createSessionSeed, floatBetween, rngFromString } from '../sessionSeed'
import { screenShake } from '../nintendo/GameJuice'
import { createBoxingBackground, RETRO_HUD_FONT } from '../nintendo/ModeBackgrounds'
import { createBoxingTextures, getNintendoPalette } from '../nintendo/ModeSprites'
import { playSfx } from '../nintendo/ChiptuneAudio'

type CrowdMember = {
  root: Phaser.GameObjects.Container
  leftArm: Phaser.GameObjects.Rectangle
  rightArm: Phaser.GameObjects.Rectangle
  baseY: number
  phase: number
  lane: number
}

export default class BoxingScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private enemy!: Phaser.Physics.Arcade.Image
  private configData: GameConfig | null = null
  private theme: GameConfig['theme'] = 'cartoon'
  private sessionSeed = ''
  private playerHp = 120
  private enemyHp = 120
  private playerMaxHp = 120
  private enemyMaxHp = 120
  private score = 0
  private roundSeconds = 90
  private roundClock = 90
  private roundCount = 3
  private paused = false
  private gameOver = false
  private playerFacing: 1 | -1 = 1
  private enemyFacing: 1 | -1 = -1
  private playerMoveSpeed = 220
  private enemyMoveSpeed = 190
  private playerPunchCooldown = 0
  private enemyPunchCooldown = 0
  private bellFlashUntil = 0
  private crowdBoostUntil = 0
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private jabKey!: Phaser.Input.Keyboard.Key
  private heavyKey!: Phaser.Input.Keyboard.Key
  private pauseKey!: Phaser.Input.Keyboard.Key
  private restartKey!: Phaser.Input.Keyboard.Key
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private hudText: Phaser.GameObjects.Text | null = null
  private noticeText: Phaser.GameObjects.Text | null = null
  private crowd: CrowdMember[] = []
  private restartKeyHeld = false
  private ringBounds = { minX: 0, maxX: 0, floorY: 0 }
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true
  private texKeys!: ReturnType<typeof createBoxingTextures>

  constructor() {
    super('BoxingScene')
  }

  init(data?: { config?: GameConfig; sessionSeed?: string }) {
    this.configData = data?.config ?? null
    if (data?.sessionSeed) this.sessionSeed = data.sessionSeed
  }

  create() {
    const cfg = this.configData ?? {
      gameType: 'boxing_1v1' as const,
      theme: 'cartoon' as const,
      difficulty: 'medium' as const,
      enemyType: 'robots' as const,
      enemyDensity: 'medium' as const,
      platformDensity: 'medium' as const,
      levelSize: 'medium' as const,
    }
    this.configData = cfg
    this.theme = cfg.theme
    if (!this.sessionSeed) this.sessionSeed = createSessionSeed()
    buildPlatformerTemplateFromConfig(cfg, this.sessionSeed)

    this.resetMatchStats(cfg)
    this.bindRestartKeys()

    this.texKeys = createBoxingTextures(this, cfg.theme)
    const bg = createBoxingBackground(this, cfg.theme, this.sessionSeed)
    this.ringBounds = bg.ringBounds
    this.createPixelCrowd()
    this.createFighters()
    this.createHud(cfg)
    attachGlobalInput()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      detachGlobalInput()
      window.removeEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
      window.removeEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)
    })
  }

  private bindRestartKeys() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.jabKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.heavyKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K)
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    this.onGlobalRestartKeyDown = (e: KeyboardEvent) => {
      const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R'
      if (!isR || !this.gameOver || this.restartKeyHeld) return
      this.restartKeyHeld = true
      this.scene.restart({ config: this.configData, sessionSeed: this.sessionSeed })
    }
    this.onGlobalRestartKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') this.restartKeyHeld = false
    }
    window.addEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
    window.addEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)
  }

  update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000
    if (this.gameOver) {
      const isDown = this.restartKey?.isDown === true
      if (isDown && !this.restartKeyHeld) {
        this.scene.restart({ config: this.configData, sessionSeed: this.sessionSeed })
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

    this.roundClock = Math.max(0, this.roundClock - dt)
    this.playerPunchCooldown = Math.max(0, this.playerPunchCooldown - dt)
    this.enemyPunchCooldown = Math.max(0, this.enemyPunchCooldown - dt)
    this.updatePlayer()
    this.updateEnemyAI()
    this.keepFightersInsideRing()
    this.updateCrowd()
    this.updateHud()
    this.checkRoundEnd()
  }

  private resetMatchStats(cfg: GameConfig) {
    this.score = 0
    this.paused = false
    this.gameOver = false
    this.roundClock = this.roundSeconds
    this.playerPunchCooldown = 0
    this.enemyPunchCooldown = 0
    this.bellFlashUntil = this.time.now + 1200

    this.roundCount = cfg.levelSize === 'small' ? 3 : cfg.levelSize === 'large' ? 7 : 5
    const hpScale = cfg.difficulty === 'hard' ? 1.15 : cfg.difficulty === 'easy' ? 0.9 : 1
    this.playerMaxHp = Math.round(130 * hpScale)
    this.enemyMaxHp = Math.round(120 * hpScale)
    this.playerHp = this.playerMaxHp
    this.enemyHp = this.enemyMaxHp
    this.playerMoveSpeed = cfg.difficulty === 'hard' ? 235 : cfg.difficulty === 'easy' ? 205 : 220
    this.enemyMoveSpeed = cfg.difficulty === 'hard' ? 210 : cfg.difficulty === 'easy' ? 165 : 190
  }

  private createPixelCrowd() {
    const pal = getNintendoPalette(this.theme)
    const w = this.scale.width
    const rng = rngFromString(`${this.sessionSeed}|boxingCrowd`)
    const topY = this.scale.height * 0.28
    this.crowd = []

    for (let lane = 0; lane < 3; lane++) {
      const y = topY - lane * 20
      const count = 18 + lane * 6
      const colors = [pal.heroCap, pal.heroOveralls, pal.grass, pal.coin]
      for (let i = 0; i < count; i++) {
        const x = ((i + 0.5) / count) * w + floatBetween(rng, -6, 6)
        const body = this.add.rectangle(0, 6, 7, 11, colors[lane % colors.length], 0.9)
        const head = this.add.circle(0, -4, 3, pal.heroSkin, 1)
        const leftArm = this.add.rectangle(-4, 5, 2, 6, pal.coinShine, 1).setOrigin(0.5, 0)
        const rightArm = this.add.rectangle(4, 5, 2, 6, pal.coinShine, 1).setOrigin(0.5, 0)
        const root = this.add.container(x, y, [body, head, leftArm, rightArm]).setDepth(1 + lane * 0.01)
        root.setAlpha(0.45 + lane * 0.15)
        this.crowd.push({ root, leftArm, rightArm, baseY: y, phase: floatBetween(rng, 0, Math.PI * 2), lane })
      }
    }
  }

  private createFighters() {
    const y = this.ringBounds.floorY
    this.player = this.physics.add.image(this.scale.width * 0.35, y, this.texKeys.player)
    this.enemy = this.physics.add.image(this.scale.width * 0.65, y, this.texKeys.enemy)
    this.player.setDepth(8).setScale(1.35)
    this.enemy.setDepth(8).setScale(1.35)
    this.player.setImmovable(true)
    this.enemy.setImmovable(true)
    this.player.setDrag(900, 0)
    this.enemy.setDrag(1000, 0)
    this.player.setMaxVelocity(320, 0)
    this.enemy.setMaxVelocity(320, 0)
  }

  private updatePlayer() {
    const left = this.leftKey.isDown || this.cursors.left.isDown || isCodeDown('KeyA')
    const right = this.rightKey.isDown || this.cursors.right.isDown || isCodeDown('KeyD')
    if (left) this.player.setVelocityX(-this.playerMoveSpeed)
    else if (right) this.player.setVelocityX(this.playerMoveSpeed)
    else this.player.setVelocityX(0)

    if (left) this.playerFacing = -1
    if (right) this.playerFacing = 1
    this.player.setFlipX(this.playerFacing < 0)

    if (Phaser.Input.Keyboard.JustDown(this.jabKey) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      this.tryPlayerPunch(9, 88, 24, 0.24)
    }
    if (Phaser.Input.Keyboard.JustDown(this.heavyKey)) {
      this.tryPlayerPunch(16, 98, 38, 0.48)
    }
  }

  private tryPlayerPunch(damage: number, range: number, knockback: number, cooldown: number) {
    if (this.playerPunchCooldown > 0) return
    this.playerPunchCooldown = cooldown
    const dx = this.enemy.x - this.player.x
    if (Math.abs(dx) > range) return
    if (Math.sign(dx) !== this.playerFacing) return

    this.enemyHp = Math.max(0, this.enemyHp - damage)
    playSfx(damage >= 14 ? 'heavyPunch' : 'punch')
    this.flashFighter(this.enemy)
    this.enemy.x += this.playerFacing * knockback
    this.score += damage * 8
    screenShake(this, 0.003, 55)
    this.crowdBoostUntil = this.time.now + 550

    this.tweens.add({
      targets: this.player,
      scaleX: this.playerFacing * 1.45,
      scaleY: 1.25,
      duration: 60,
      yoyo: true,
    })
  }

  private flashFighter(sprite: Phaser.Physics.Arcade.Image) {
    sprite.setTintFill(0xffffff)
    this.time.delayedCall(70, () => sprite.clearTint())
  }

  private updateEnemyAI() {
    const toPlayer = this.player.x - this.enemy.x
    this.enemyFacing = toPlayer >= 0 ? 1 : -1
    this.enemy.setFlipX(this.enemyFacing > 0)

    const targetDist = 84
    const abs = Math.abs(toPlayer)
    if (abs > targetDist + 14) {
      this.enemy.setVelocityX(this.enemyFacing * this.enemyMoveSpeed)
    } else if (abs < targetDist - 16) {
      this.enemy.setVelocityX(-this.enemyFacing * this.enemyMoveSpeed * 0.55)
    } else {
      this.enemy.setVelocityX(0)
    }

    if (this.enemyPunchCooldown > 0 || abs > 96) return

    const enemyHpNorm = Phaser.Math.Clamp(this.enemyHp / Math.max(1, this.enemyMaxHp), 0, 1)
    const attackChance = 0.014 + (enemyHpNorm < 0.4 ? 0.02 : 0)
    if (Math.random() < attackChance) {
      const isHeavy = Math.random() < (enemyHpNorm < 0.5 ? 0.48 : 0.26)
      const damage = isHeavy ? 12 : 8
      this.enemyPunchCooldown = isHeavy ? 0.65 : 0.36
      this.playerHp = Math.max(0, this.playerHp - damage)
      playSfx(isHeavy ? 'heavyPunch' : 'punch')
      this.flashFighter(this.player)
      this.player.x += this.enemyFacing * 22
      screenShake(this, 0.004, 48)
      this.crowdBoostUntil = this.time.now + 400
    }
  }

  private keepFightersInsideRing() {
    const y = this.ringBounds.floorY
    this.player.x = Phaser.Math.Clamp(this.player.x, this.ringBounds.minX, this.ringBounds.maxX)
    this.enemy.x = Phaser.Math.Clamp(this.enemy.x, this.ringBounds.minX, this.ringBounds.maxX)
    this.player.y = y
    this.enemy.y = y
  }

  private createHud(cfg: GameConfig) {
    const pal = getNintendoPalette(cfg.theme)
    this.hudText = this.add
      .text(12, 10, '', {
        fontFamily: RETRO_HUD_FONT,
        fontSize: '10px',
        color: pal.hudText,
        lineSpacing: 8,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setDepth(31)
      .setScrollFactor(0)

    this.noticeText = this.add
      .text(this.scale.width / 2, this.scale.height * 0.12, '', {
        fontFamily: RETRO_HUD_FONT,
        fontSize: '14px',
        color: '#ffe066',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setScrollFactor(0)

    if (this.time.now < this.bellFlashUntil) {
      playSfx('bell')
      this.showNotice('🛎 FIGHT!')
    }
    this.updateHud()
  }

  private updateHud() {
    if (!this.hudText) return
    const world = this.theme.toUpperCase().slice(0, 3)
    this.hudText.setText(
      [
        `P1 █${Math.ceil(this.playerHp)}   FOE █${Math.ceil(this.enemyHp)}   ★${this.score}`,
        `⏱ ${Math.ceil(this.roundClock)}s   RND ${this.roundCount}   ${world}-RING`,
        'A/D Move · J Jab · K Heavy · P Pause',
      ].join('\n'),
    )
  }

  private updateCrowd() {
    const enemyHpNorm = Phaser.Math.Clamp(this.enemyHp / Math.max(1, this.enemyMaxHp), 0, 1)
    const burst = this.time.now < this.crowdBoostUntil ? 0.4 : 0
    const intensity = Phaser.Math.Clamp(0.4 + (1 - enemyHpNorm) * 1.1 + burst, 0.35, 1.8)
    const t = this.time.now * 0.007

    for (const fan of this.crowd) {
      const laneMul = 1 - fan.lane * 0.12
      fan.root.y = fan.baseY + Math.sin(t + fan.phase) * (2.5 + intensity * 3) * laneMul
      const armLift = -0.75 - intensity * 0.85 + Math.sin(t * 1.5 + fan.phase) * 0.3
      fan.leftArm.rotation = armLift
      fan.rightArm.rotation = -armLift
    }
  }

  private checkRoundEnd() {
    if (this.enemyHp <= 0) {
      this.gameOver = true
      this.physics.world.isPaused = true
      playSfx('fanfare')
      this.cameras.main.flash(400, 255, 220, 100, false)
      this.showNotice('🥊 K.O.!\nPRESS R TO RESTART')
      return
    }
    if (this.playerHp <= 0) {
      this.gameOver = true
      this.physics.world.isPaused = true
      playSfx('lose')
      this.showNotice('💫 KNOCKED OUT!\nPRESS R TO RETRY')
      return
    }
    if (this.roundClock <= 0) {
      this.gameOver = true
      this.physics.world.isPaused = true
      playSfx(this.playerHp >= this.enemyHp ? 'win' : 'lose')
      this.showNotice(
        this.playerHp >= this.enemyHp
          ? '🏆 DECISION WIN!\nPRESS R TO RESTART'
          : '😵 DECISION LOSS\nPRESS R TO RETRY',
      )
    }
  }

  private showNotice(text: string) {
    if (this.noticeText) this.noticeText.setText(text)
  }
}
