import Phaser from 'phaser'

import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'
import { createSessionSeed, floatBetween, rngFromString } from '../sessionSeed'

type CrowdMember = {
  root: Phaser.GameObjects.Container
  leftArm: Phaser.GameObjects.Rectangle
  rightArm: Phaser.GameObjects.Rectangle
  baseY: number
  phase: number
  lane: number
}

const HUD_FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

export default class BoxingScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private enemy!: Phaser.Physics.Arcade.Image

  private configData: GameConfig | null = null
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
  private hudChrome: Phaser.GameObjects.Graphics | null = null
  private crowd: CrowdMember[] = []

  private restartKeyHeld = false
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true

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
      theme: 'cyberpunk',
      difficulty: 'medium',
      enemyType: 'robots',
      enemyDensity: 'medium',
      platformDensity: 'medium',
      levelSize: 'medium',
    }
    if (!this.sessionSeed) this.sessionSeed = createSessionSeed()
    const template = buildPlatformerTemplateFromConfig(cfg, this.sessionSeed)

    this.resetMatchStats(cfg)
    this.cameras.main.setBackgroundColor(template.theme.backgroundColor)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.jabKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.heavyKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K)
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)

    this.onGlobalRestartKeyDown = (e: KeyboardEvent) => {
      const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R'
      if (!isR) return
      if (!this.gameOver) return
      if (this.restartKeyHeld) return
      this.restartKeyHeld = true
      this.scene.restart({ config: this.configData, sessionSeed: this.sessionSeed })
    }
    this.onGlobalRestartKeyUp = (e: KeyboardEvent) => {
      const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R'
      if (!isR) return
      this.restartKeyHeld = false
    }
    window.addEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
    window.addEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)

    this.createTextures(template.theme.playerFill, template.theme.platformStroke)
    this.drawArena()
    this.createCrowd()
    this.createFighters()
    this.createHud(cfg)
    attachGlobalInput()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      detachGlobalInput()
      window.removeEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
      window.removeEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)
    })
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
      this.showNotice(this.paused ? 'PAUSED' : '')
    }
    if (this.paused) return

    this.roundClock = Math.max(0, this.roundClock - dt)
    this.playerPunchCooldown = Math.max(0, this.playerPunchCooldown - dt)
    this.enemyPunchCooldown = Math.max(0, this.enemyPunchCooldown - dt)
    this.updatePlayer()
    this.updateEnemyAI()
    this.keepFightersInsideRing()
    this.updateCrowd()
    this.updateHudText()
    this.checkRoundEnd()
  }

  private resetMatchStats(cfg: GameConfig) {
    this.score = 0
    this.paused = false
    this.gameOver = false
    this.roundClock = this.roundSeconds
    this.playerPunchCooldown = 0
    this.enemyPunchCooldown = 0
    this.bellFlashUntil = this.time.now + 900

    this.roundCount =
      cfg.levelSize === 'small' ? 3 : cfg.levelSize === 'large' ? 7 : 5

    const hpScale = cfg.difficulty === 'hard' ? 1.15 : cfg.difficulty === 'easy' ? 0.9 : 1
    this.playerMaxHp = Math.round(130 * hpScale)
    this.enemyMaxHp = Math.round(120 * hpScale)
    this.playerHp = this.playerMaxHp
    this.enemyHp = this.enemyMaxHp
    this.playerMoveSpeed = cfg.difficulty === 'hard' ? 230 : cfg.difficulty === 'easy' ? 210 : 220
    this.enemyMoveSpeed = cfg.difficulty === 'hard' ? 205 : cfg.difficulty === 'easy' ? 170 : 190
  }

  private drawArena() {
    const w = this.scale.width
    const h = this.scale.height

    this.add.rectangle(w / 2, h / 2, w, h, 0x090d16, 0.78)
    this.add.circle(w * 0.2, h * 0.25, 170, 0x32a9ff, 0.1)
    this.add.circle(w * 0.8, h * 0.2, 180, 0xff4da8, 0.1)
    this.add.circle(w * 0.5, h * 0.62, 220, 0x35ffd6, 0.07)

    const ring = this.add.graphics().setDepth(2)
    const ringW = w * 0.76
    const ringH = h * 0.36
    const ringX = (w - ringW) / 2
    const ringY = h * 0.5
    ring.fillStyle(0x2a3348, 0.95)
    ring.fillRoundedRect(ringX, ringY, ringW, ringH, 20)
    ring.fillStyle(0x4f5f7d, 0.4)
    ring.fillRoundedRect(ringX + 12, ringY + 10, ringW - 24, ringH - 20, 16)

    ring.lineStyle(5, 0xffffff, 0.36)
    ring.strokeRoundedRect(ringX, ringY, ringW, ringH, 20)
    for (let i = 0; i < 3; i++) {
      const y = ringY - 24 + i * 14
      ring.lineStyle(3, 0xef4a80 + i * 0x001818, 0.76 - i * 0.15)
      ring.lineBetween(ringX - 8, y, ringX + ringW + 8, y)
    }
  }

  private createCrowd() {
    const w = this.scale.width
    const h = this.scale.height
    const rng = rngFromString(`${this.sessionSeed}|boxingCrowd`)
    const topY = h * 0.32
    const laneGap = 24
    this.crowd = []

    for (let lane = 0; lane < 3; lane++) {
      const y = topY - lane * laneGap
      const count = 16 + lane * 8
      for (let i = 0; i < count; i++) {
        const x = ((i + 0.5) / count) * w + floatBetween(rng, -8, 8)
        const body = this.add.rectangle(0, 8, 8, 14, 0x2b374d, 0.95)
        const head = this.add.circle(0, -3, 4, 0xf2dcc5, 1)
        const leftArm = this.add.rectangle(-4, 7, 2, 7, 0x8bd7ff, 1).setOrigin(0.5, 0)
        const rightArm = this.add.rectangle(4, 7, 2, 7, 0x8bd7ff, 1).setOrigin(0.5, 0)
        const root = this.add.container(x, y, [body, head, leftArm, rightArm]).setDepth(3 + lane * 0.01)
        root.setAlpha(0.45 + lane * 0.18)
        this.crowd.push({
          root,
          leftArm,
          rightArm,
          baseY: y,
          phase: floatBetween(rng, 0, Math.PI * 2),
          lane,
        })
      }
    }
  }

  private createTextures(primary: number, accent: number) {
    const g = this.make.graphics({ x: 0, y: 0 })

    g.fillStyle(0x05070e, 0.35)
    g.fillEllipse(32, 78, 34, 9)
    g.fillStyle(0x2e3f5c, 1)
    g.fillRoundedRect(16, 18, 32, 52, 10)
    g.fillStyle(0xf2dcc5, 1)
    g.fillCircle(32, 16, 12)
    g.fillStyle(primary, 1)
    g.fillRoundedRect(8, 34, 16, 14, 6)
    g.fillRoundedRect(40, 34, 16, 14, 6)
    g.fillStyle(0xffffff, 0.17)
    g.fillRoundedRect(20, 24, 6, 36, 3)
    g.lineStyle(2, accent, 0.8)
    g.strokeRoundedRect(16, 18, 32, 52, 10)
    g.generateTexture('boxerPlayerTex', 64, 84)

    g.clear()
    g.fillStyle(0x05070e, 0.35)
    g.fillEllipse(32, 78, 34, 9)
    g.fillStyle(0x5c2d33, 1)
    g.fillRoundedRect(16, 18, 32, 52, 10)
    g.fillStyle(0xf0d4ba, 1)
    g.fillCircle(32, 16, 12)
    g.fillStyle(0xd94669, 1)
    g.fillRoundedRect(8, 34, 16, 14, 6)
    g.fillRoundedRect(40, 34, 16, 14, 6)
    g.fillStyle(0xffffff, 0.14)
    g.fillRoundedRect(38, 22, 6, 38, 3)
    g.lineStyle(2, 0xff7fa8, 0.8)
    g.strokeRoundedRect(16, 18, 32, 52, 10)
    g.generateTexture('boxerEnemyTex', 64, 84)
    g.destroy()
  }

  private createFighters() {
    const h = this.scale.height
    this.player = this.physics.add.image(this.scale.width * 0.35, h * 0.72, 'boxerPlayerTex')
    this.enemy = this.physics.add.image(this.scale.width * 0.65, h * 0.72, 'boxerEnemyTex')
    this.player.setDepth(8).setCollideWorldBounds(false)
    this.enemy.setDepth(8).setCollideWorldBounds(false)
    this.player.setImmovable(true)
    this.enemy.setImmovable(true)
    this.player.setDrag(800, 0)
    this.enemy.setDrag(900, 0)
    this.player.setMaxVelocity(300, 0)
    this.enemy.setMaxVelocity(300, 0)
  }

  private updatePlayer() {
    const left =
      this.leftKey.isDown || this.cursors.left.isDown || isCodeDown('KeyA')
    const right =
      this.rightKey.isDown || this.cursors.right.isDown || isCodeDown('KeyD')
    if (left) this.player.setVelocityX(-this.playerMoveSpeed)
    else if (right) this.player.setVelocityX(this.playerMoveSpeed)
    else this.player.setVelocityX(0)

    if (left) this.playerFacing = -1
    if (right) this.playerFacing = 1
    this.player.setFlipX(this.playerFacing < 0)

    if (Phaser.Input.Keyboard.JustDown(this.jabKey) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      this.tryPlayerPunch(8, 86, 22, 0.26)
    }
    if (Phaser.Input.Keyboard.JustDown(this.heavyKey)) {
      this.tryPlayerPunch(14, 98, 36, 0.5)
    }
  }

  private tryPlayerPunch(damage: number, range: number, knockback: number, cooldown: number) {
    if (this.playerPunchCooldown > 0) return
    this.playerPunchCooldown = cooldown
    const dx = this.enemy.x - this.player.x
    if (Math.abs(dx) > range) return
    if (Math.sign(dx) !== this.playerFacing) return

    this.enemyHp = Math.max(0, this.enemyHp - damage)
    this.enemy.setTintFill(0xffffff)
    this.time.delayedCall(65, () => this.enemy.clearTint())
    this.enemy.x += this.playerFacing * knockback
    this.score += damage * 7
    this.cameras.main.shake(55, 0.0022)
    this.crowdBoostUntil = this.time.now + 520
  }

  private updateEnemyAI() {
    const toPlayer = this.player.x - this.enemy.x
    this.enemyFacing = toPlayer >= 0 ? 1 : -1
    this.enemy.setFlipX(this.enemyFacing > 0)

    const targetDist = 82
    const abs = Math.abs(toPlayer)
    if (abs > targetDist + 14) {
      this.enemy.setVelocityX(this.enemyFacing * this.enemyMoveSpeed)
    } else if (abs < targetDist - 16) {
      this.enemy.setVelocityX(-this.enemyFacing * this.enemyMoveSpeed * 0.6)
    } else {
      this.enemy.setVelocityX(0)
    }

    if (this.enemyPunchCooldown > 0) return
    if (abs > 95) return

    const enemyHpNorm = Phaser.Math.Clamp(this.enemyHp / Math.max(1, this.enemyMaxHp), 0, 1)
    const aggressionBonus = enemyHpNorm < 0.4 ? 0.22 : 0
    const attackChance = 0.012 + aggressionBonus
    if (Math.random() < attackChance) {
      const isHeavy = Math.random() < (enemyHpNorm < 0.5 ? 0.5 : 0.28)
      const damage = isHeavy ? 11 : 7
      const cooldown = isHeavy ? 0.62 : 0.34
      this.enemyPunchCooldown = cooldown
      this.playerHp = Math.max(0, this.playerHp - damage)
      this.player.setTintFill(0xffffff)
      this.time.delayedCall(70, () => this.player.clearTint())
      this.player.x += this.enemyFacing * 20
      this.cameras.main.shake(48, 0.002)
      this.crowdBoostUntil = this.time.now + 380
    }
  }

  private keepFightersInsideRing() {
    const minX = this.scale.width * 0.19
    const maxX = this.scale.width * 0.81
    const fixedY = this.scale.height * 0.72
    this.player.x = Phaser.Math.Clamp(this.player.x, minX, maxX)
    this.enemy.x = Phaser.Math.Clamp(this.enemy.x, minX, maxX)
    this.player.y = fixedY
    this.enemy.y = fixedY
  }

  private createHud(cfg: GameConfig) {
    this.hudChrome = this.add.graphics().setDepth(30).setScrollFactor(0)
    this.hudText = this.add
      .text(14, 14, '', {
        fontFamily: HUD_FONT,
        fontSize: '13px',
        color: '#f1f5f9',
        lineSpacing: 4,
      })
      .setDepth(31)
      .setScrollFactor(0)
    this.noticeText = this.add
      .text(this.scale.width / 2, 14, '', {
        fontFamily: HUD_FONT,
        fontSize: '20px',
        color: '#fefefe',
      })
      .setOrigin(0.5, 0)
      .setDepth(32)
      .setScrollFactor(0)

    this.updateHudText(
      `BOXING 1V1 // ${cfg.theme.toUpperCase()} // ${cfg.difficulty.toUpperCase()}`,
    )
  }

  private updateHudText(modeLabel?: string) {
    if (!this.hudText) return
    const hpP = Phaser.Math.Clamp(this.playerHp / Math.max(1, this.playerMaxHp), 0, 1)
    const hpE = Phaser.Math.Clamp(this.enemyHp / Math.max(1, this.enemyMaxHp), 0, 1)
    const timerNorm = Phaser.Math.Clamp(this.roundClock / Math.max(1, this.roundSeconds), 0, 1)

    if (this.hudChrome) {
      this.hudChrome.clear()
      this.hudChrome.fillStyle(0x070b13, 0.68)
      this.hudChrome.fillRoundedRect(10, 10, 464, 108, 12)
      this.hudChrome.lineStyle(1, 0x7be4ff, 0.4)
      this.hudChrome.strokeRoundedRect(10, 10, 464, 108, 12)

      this.hudChrome.fillStyle(0xffffff, 0.1)
      this.hudChrome.fillRect(24, 56, 180, 10)
      this.hudChrome.fillRect(24, 76, 180, 10)
      this.hudChrome.fillRect(24, 96, 180, 6)

      this.hudChrome.fillStyle(0x43f0a1, 0.94)
      this.hudChrome.fillRect(24, 56, 180 * hpP, 10)
      this.hudChrome.fillStyle(0xff5b7a, 0.95)
      this.hudChrome.fillRect(24, 76, 180 * hpE, 10)
      this.hudChrome.fillStyle(0x71d8ff, 0.92)
      this.hudChrome.fillRect(24, 96, 180 * timerNorm, 6)

      if (this.time.now < this.bellFlashUntil) {
        this.hudChrome.fillStyle(0xfff3a0, 0.22)
        this.hudChrome.fillRoundedRect(214, 16, 246, 32, 8)
      }
    }

    const extra = modeLabel ? `${modeLabel}\n` : ''
    this.hudText.setText(
      `${extra}P1 HP ${this.playerHp}   ENEMY HP ${this.enemyHp}\nROUND TIME ${Math.ceil(this.roundClock)}s   SCHEDULED ${this.roundCount} ROUNDS\nA/D move · J jab · K heavy · P pause`,
    )
  }

  private updateCrowd() {
    const enemyHpNorm = Phaser.Math.Clamp(this.enemyHp / Math.max(1, this.enemyMaxHp), 0, 1)
    const depletionExcite = 1 - enemyHpNorm
    const burst = this.time.now < this.crowdBoostUntil ? 0.35 : 0
    const intensity = Phaser.Math.Clamp(0.35 + depletionExcite * 1.2 + burst, 0.3, 1.7)
    const t = this.time.now * 0.006

    for (const fan of this.crowd) {
      const laneMul = 1 - fan.lane * 0.15
      const bob = Math.sin(t + fan.phase) * (2 + intensity * 2.8) * laneMul
      fan.root.y = fan.baseY + bob
      const armLift = -0.7 - intensity * 0.9 + Math.sin(t * 1.4 + fan.phase) * 0.25
      fan.leftArm.rotation = armLift
      fan.rightArm.rotation = -armLift
      fan.root.scaleX = 1 + Math.sin(t * 0.8 + fan.phase) * 0.04 * intensity
      fan.root.scaleY = 1 + Math.cos(t * 0.75 + fan.phase) * 0.05 * intensity
      fan.root.alpha = Phaser.Math.Clamp(0.4 + laneMul * 0.42 + intensity * 0.08, 0.35, 0.95)
    }
  }

  private checkRoundEnd() {
    if (this.enemyHp <= 0) {
      this.gameOver = true
      this.physics.world.isPaused = true
      this.showNotice('KNOCKOUT! // PRESS R TO RESTART')
      return
    }
    if (this.playerHp <= 0) {
      this.gameOver = true
      this.physics.world.isPaused = true
      this.showNotice('YOU WERE KNOCKED OUT // PRESS R TO RETRY')
      return
    }
    if (this.roundClock <= 0) {
      this.gameOver = true
      this.physics.world.isPaused = true
      this.showNotice(
        this.playerHp >= this.enemyHp
          ? 'DECISION WIN // PRESS R TO RESTART'
          : 'DECISION LOSS // PRESS R TO RETRY',
      )
    }
  }

  private showNotice(text: string) {
    if (this.noticeText) this.noticeText.setText(text)
  }
}

