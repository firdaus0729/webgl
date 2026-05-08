import Phaser from 'phaser'

import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'
import { createSessionSeed, intBetween, rngFromString } from '../sessionSeed'

type ArenaEnemy = Phaser.Physics.Arcade.Image & {
  hp: number
  maxHp: number
}

const HUD_FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

/**
 * Top-down arena: 8-way movement, shoot toward aim vector (last move / default up).
 * Enemies spawn at arena edges and chase the player.
 */
export default class TopDownArenaScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private shootKey!: Phaser.Input.Keyboard.Key
  private pauseKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private downKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private restartKey!: Phaser.Input.Keyboard.Key
  private bullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private configData: GameConfig | null = null
  private score = 0
  private hp = 100
  private paused = false
  private gameOver = false
  private lastShotAt = 0
  private hudText: Phaser.GameObjects.Text | null = null
  private noticeText: Phaser.GameObjects.Text | null = null
  private hudChrome: Phaser.GameObjects.Graphics | null = null
  private restartKeyHeld = false
  private aimX = 0
  private aimY = -1
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true
  private arenaPad = 48
  private totalSpawned = 0
  private targetKills = 0
  private kills = 0
  private lastPlayerHitAt = 0
  private hudBannerLine = ''
  private sessionSeed = ''
  private arenaMoveMul = 1

  constructor() {
    super('TopDownArenaScene')
  }

  init(data?: { config?: GameConfig; sessionSeed?: string }) {
    this.configData = data?.config ?? null
    if (data?.sessionSeed) this.sessionSeed = data.sessionSeed
  }

  create() {
    this.score = 0
    this.hp = 100
    this.paused = false
    this.gameOver = false
    this.lastShotAt = 0
    this.kills = 0
    this.totalSpawned = 0
    this.lastPlayerHitAt = 0
    this.aimX = 0
    this.aimY = -1

    const cfg = this.configData ?? {
      gameType: 'top_down_arena' as const,
      theme: 'cyberpunk',
      difficulty: 'medium',
      enemyType: 'drones',
      enemyDensity: 'medium',
      platformDensity: 'medium',
      levelSize: 'medium',
    }
    this.configData = cfg
    if (!this.sessionSeed) this.sessionSeed = createSessionSeed()
    const template = buildPlatformerTemplateFromConfig(cfg, this.sessionSeed)
    this.arenaMoveMul = template.sessionVariant?.arenaPlayerSpeedMul ?? 1

    this.cameras.main.setBackgroundColor(template.theme.backgroundColor)
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.shootKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P)
    this.upKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
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
    this.drawArena(template.theme.platformStroke)
    this.createPlayer()
    this.createPools()
    this.computeWaveTargets(cfg, template.sessionVariant?.arenaKillTargetMul ?? 1)
    this.spawnWave(cfg)
    this.registerCollisions()
    this.createHud(cfg)
    attachGlobalInput()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      detachGlobalInput()
      window.removeEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
      window.removeEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)
    })
  }

  private computeWaveTargets(cfg: GameConfig, killMul: number) {
    const base =
      cfg.enemyDensity === 'low' ? 10 : cfg.enemyDensity === 'high' ? 24 : 16
    const scaled =
      cfg.levelSize === 'large' ? base + 6 : cfg.levelSize === 'small' ? Math.max(6, base - 4) : base
    this.targetKills = Math.max(6, Math.round(scaled * killMul))
  }

  private spawnWave(cfg: GameConfig) {
    const w = this.scale.width
    const h = this.scale.height
    const pad = this.arenaPad
    const remaining = this.targetKills - this.totalSpawned
    const batch = Math.min(remaining, cfg.enemyDensity === 'high' ? 7 : cfg.enemyDensity === 'low' ? 4 : 5)
    if (batch <= 0) return

    const speedBase =
      cfg.difficulty === 'hard' ? 95 : cfg.difficulty === 'easy' ? 55 : 75

    for (let i = 0; i < batch; i++) {
      const rng = rngFromString(`${this.sessionSeed}|arena|${this.totalSpawned}|${i}`)
      const edge = intBetween(rng, 0, 3)
      let x = w / 2
      let y = h / 2
      if (edge === 0) {
        x = intBetween(rng, pad, w - pad)
        y = pad
      } else if (edge === 1) {
        x = w - pad
        y = intBetween(rng, pad, h - pad)
      } else if (edge === 2) {
        x = intBetween(rng, pad, w - pad)
        y = h - pad
      } else {
        x = pad
        y = intBetween(rng, pad, h - pad)
      }

      const enemy = this.enemies.create(x, y, 'arenaEnemyTex') as ArenaEnemy
      enemy.setImmovable(true)
      enemy.setData('speed', speedBase + intBetween(rng, -8, 18))
      const maxHp = cfg.difficulty === 'hard' ? 3 : cfg.difficulty === 'easy' ? 1 : 2
      enemy.hp = maxHp
      enemy.maxHp = maxHp
      this.totalSpawned++
    }
  }

  update() {
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

    const speed = 300 * this.arenaMoveMul
    const leftDown =
      Number(this.cursors.left.isDown) +
      Number(this.leftKey.isDown) +
      Number(isCodeDown('KeyA'))
    const rightDown =
      Number(this.cursors.right.isDown) +
      Number(this.rightKey.isDown) +
      Number(isCodeDown('KeyD'))
    const upDown =
      Number(this.cursors.up.isDown) + Number(this.upKey.isDown) + Number(isCodeDown('KeyW'))
    const downDown =
      Number(this.cursors.down.isDown) +
      Number(this.downKey.isDown) +
      Number(isCodeDown('KeyS'))

    const ix = Number(rightDown > 0) - Number(leftDown > 0)
    const iy = Number(downDown > 0) - Number(upDown > 0)
    const v = new Phaser.Math.Vector2(ix, iy)
    if (v.lengthSq() > 0) {
      v.normalize().scale(speed)
      this.player.setVelocity(v.x, v.y)
      this.aimX = v.x
      this.aimY = v.y
    } else {
      this.player.setVelocity(0, 0)
    }

    if (this.shootKey.isDown || this.cursors.space.isDown) {
      this.tryShoot()
    }

    const pad = this.arenaPad
    this.player.x = Phaser.Math.Clamp(this.player.x, pad, this.scale.width - pad)
    this.player.y = Phaser.Math.Clamp(this.player.y, pad, this.scale.height - pad)

    const cfg = this.configData
    if (!cfg) return
    for (const child of this.enemies.getChildren()) {
      const enemy = child as ArenaEnemy
      if (!enemy.active) continue
      const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
      const sp = enemy.getData('speed') as number
      enemy.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp)
    }

    if (
      this.enemies.countActive(true) === 0 &&
      this.kills < this.targetKills &&
      this.totalSpawned < this.targetKills
    ) {
      this.spawnWave(cfg)
    }

    if (this.kills >= this.targetKills && this.enemies.countActive(true) === 0) {
      this.win()
    }

    this.updateHudText()
  }

  private drawArena(accent: number) {
    const w = this.scale.width
    const h = this.scale.height
    const pad = this.arenaPad

    this.add.rectangle(w / 2, h / 2, w, h, 0x070b13, 0.7).setDepth(0)
    this.add.circle(w * 0.5, h * 0.52, h * 0.35, accent, 0.12).setDepth(0)
    this.add.circle(w * 0.28, h * 0.24, h * 0.22, 0xff4aa1, 0.08).setDepth(0)
    this.add.circle(w * 0.78, h * 0.2, h * 0.2, 0x37b6ff, 0.08).setDepth(0)

    const g = this.add.graphics().setDepth(1)
    g.lineStyle(1, 0xffffff, 0.08)
    for (let x = pad; x <= w - pad; x += 34) g.lineBetween(x, pad, x, h - pad)
    for (let y = pad; y <= h - pad; y += 34) g.lineBetween(pad, y, w - pad, y)

    g.lineStyle(4, accent, 0.45)
    g.strokeRoundedRect(pad - 8, pad - 8, w - (pad - 8) * 2, h - (pad - 8) * 2, 18)
    g.lineStyle(2, 0xffffff, 0.16)
    g.strokeRoundedRect(pad + 12, pad + 12, w - (pad + 12) * 2, h - (pad + 12) * 2, 14)

    // Arena center ring motif (closer to premium fighter/arena samples).
    const centerX = w / 2
    const centerY = h / 2
    g.lineStyle(3, 0xa6ebff, 0.45)
    g.strokeCircle(centerX, centerY, 95)
    g.lineStyle(2, 0xffffff, 0.12)
    g.strokeCircle(centerX, centerY, 140)
  }

  private createTextures(primary: number, accent: number) {
    const g = this.make.graphics({ x: 0, y: 0 })

    // Player: layered core + ring to avoid vague blob look.
    g.fillStyle(0x04070f, 0.35)
    g.fillEllipse(20, 36, 24, 8)
    g.fillGradientStyle(primary, primary, accent, accent, 1)
    g.fillCircle(20, 20, 16)
    g.lineStyle(3, 0x0a0d14, 0.34)
    g.strokeCircle(20, 20, 16)
    g.fillStyle(0xffffff, 0.92)
    g.fillCircle(24, 16, 4)
    g.fillStyle(accent, 0.78)
    g.fillCircle(20, 20, 7)
    g.generateTexture('arenaPlayerTex', 40, 42)

    g.clear()
    g.fillStyle(0x04070f, 0.34)
    g.fillEllipse(19, 34, 22, 8)
    g.fillGradientStyle(0xff4b6f, 0xff4b6f, 0x572de6, 0x572de6, 1)
    g.fillRoundedRect(4, 4, 30, 30, 8)
    g.fillStyle(0xffffff, 0.95)
    g.fillCircle(14, 19, 3)
    g.fillCircle(24, 19, 3)
    g.fillStyle(0x1a2030, 0.75)
    g.fillRoundedRect(12, 24, 14, 5, 3)
    g.lineStyle(2, 0xffffff, 0.2)
    g.strokeRoundedRect(4, 4, 30, 30, 8)
    g.generateTexture('arenaEnemyTex', 38, 40)

    g.clear()
    g.fillStyle(0xfff6d2, 0.98)
    g.fillCircle(6, 6, 5)
    g.fillStyle(accent, 0.85)
    g.fillCircle(6, 6, 2)
    g.generateTexture('arenaBulletTex', 12, 12)
    g.destroy()
  }

  private createPlayer() {
    this.player = this.physics.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'arenaPlayerTex',
    )
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(6)
    this.player.setMaxVelocity(400, 400)
  }

  private createPools() {
    this.bullets = this.physics.add.group({ maxSize: 90 })
    this.enemies = this.physics.add.group()
  }

  private tryShoot() {
    if (this.time.now - this.lastShotAt < 95) return
    this.lastShotAt = this.time.now

    let ax = this.aimX
    let ay = this.aimY
    const len = Math.hypot(ax, ay)
    if (len < 0.01) {
      ax = 0
      ay = -1
    } else {
      ax /= len
      ay /= len
    }

    const bullet = this.bullets.get(
      this.player.x + ax * 22,
      this.player.y + ay * 22,
      'arenaBulletTex',
    ) as Phaser.Physics.Arcade.Image | null
    if (!bullet) return
    bullet.enableBody(true, this.player.x + ax * 22, this.player.y + ay * 22, true, true)
    bullet.setActive(true).setVisible(true).setDepth(8)
    const bulletSpeed = 720
    bullet.setVelocity(ax * bulletSpeed, ay * bulletSpeed)
    this.time.delayedCall(1400, () => {
      if (bullet.active) bullet.disableBody(true, true)
    })
  }

  private registerCollisions() {
    this.physics.add.overlap(this.bullets, this.enemies, (bulletObj, enemyObj) => {
      const bullet = bulletObj as Phaser.Physics.Arcade.Image
      const enemy = enemyObj as ArenaEnemy
      bullet.disableBody(true, true)
      enemy.hp -= 1
      if (enemy.hp <= 0) {
        enemy.disableBody(true, true)
        this.kills += 1
        this.score += 120
        this.cameras.main.shake(40, 0.002)
      }
    })

    this.physics.add.overlap(this.player, this.enemies, () => {
      if (this.gameOver) return
      if (this.time.now - this.lastPlayerHitAt < 420) return
      this.lastPlayerHitAt = this.time.now
      this.hp = Math.max(0, this.hp - 12)
      this.cameras.main.shake(100, 0.0035)
      if (this.hp <= 0) {
        this.fail()
      }
    })
  }

  private createHud(cfg: GameConfig) {
    const hud = this.add.graphics().setDepth(29).setScrollFactor(0)
    hud.fillStyle(0x070b17, 0.64)
    hud.fillRoundedRect(10, 10, 420, 92, 12)
    hud.lineStyle(1, 0x69e2ff, 0.45)
    hud.strokeRoundedRect(10, 10, 420, 92, 12)
    hud.fillStyle(0xffffff, 0.08)
    hud.fillRect(24, 58, 170, 8)
    hud.fillRect(24, 78, 170, 8)
    this.hudChrome = hud

    this.hudText = this.add
      .text(14, 14, '', {
        fontFamily: HUD_FONT,
        fontSize: '13px',
        color: '#E5E7EB',
        lineSpacing: 4,
      })
      .setDepth(30)
      .setScrollFactor(0)

    this.noticeText = this.add
      .text(this.scale.width / 2, 16, '', {
        fontFamily: HUD_FONT,
        fontSize: '18px',
        color: '#F9FAFB',
      })
      .setOrigin(0.5, 0)
      .setDepth(35)
      .setScrollFactor(0)

    this.updateHudText(
      `TOP-DOWN ARENA // ${cfg.theme.toUpperCase()} // ${cfg.difficulty.toUpperCase()}`,
    )
  }

  private updateHudText(modeLabel?: string) {
    if (!this.hudText) return
    if (modeLabel) this.hudBannerLine = modeLabel
    const label = this.hudBannerLine ? `${this.hudBannerLine}\n` : ''
    const hpNorm = Phaser.Math.Clamp(this.hp / 100, 0, 1)
    const waveNorm = Phaser.Math.Clamp(this.kills / Math.max(1, this.targetKills), 0, 1)

    if (this.hudChrome) {
      this.hudChrome.clear()
      this.hudChrome.fillStyle(0x070b17, 0.64)
      this.hudChrome.fillRoundedRect(10, 10, 420, 92, 12)
      this.hudChrome.lineStyle(1, 0x69e2ff, 0.45)
      this.hudChrome.strokeRoundedRect(10, 10, 420, 92, 12)
      this.hudChrome.fillStyle(0xffffff, 0.08)
      this.hudChrome.fillRect(24, 58, 170, 8)
      this.hudChrome.fillRect(24, 78, 170, 8)
      this.hudChrome.fillStyle(0x3df28c, 0.92)
      this.hudChrome.fillRect(24, 58, 170 * hpNorm, 8)
      this.hudChrome.fillStyle(0x5ed7ff, 0.92)
      this.hudChrome.fillRect(24, 78, 170 * waveNorm, 8)
    }

    this.hudText.setText(
      `${label}SCORE ${this.score}   HP ${this.hp}\nKILLS ${this.kills} / ${this.targetKills}   ENEMIES ${this.enemies.countActive(true)}\nWASD move · J / Space fire · Aim via movement`,
    )
  }

  private showNotice(text: string) {
    if (this.noticeText) this.noticeText.setText(text)
  }

  private win() {
    this.gameOver = true
    this.physics.world.isPaused = true
    this.showNotice('ARENA CLEARED // PRESS R TO RESTART')
  }

  private fail() {
    this.gameOver = true
    this.physics.world.isPaused = true
    this.showNotice('DEFEAT // PRESS R TO RETRY')
  }
}
