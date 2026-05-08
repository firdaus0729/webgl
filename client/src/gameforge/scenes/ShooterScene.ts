import Phaser from 'phaser'

import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'
import {
  createSessionSeed,
  floatBetween,
  intBetween,
  rngFromString,
} from '../sessionSeed'

type EnemyShip = Phaser.Physics.Arcade.Image
type EnemyHpUi = {
  text: Phaser.GameObjects.Text
  hideAt: number
  hp: number
  maxHp: number
}

export default class ShooterScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private shootKey!: Phaser.Input.Keyboard.Key
  private pauseKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private downKey!: Phaser.Input.Keyboard.Key
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private bullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private stars!: Phaser.GameObjects.Group
  private configData: GameConfig | null = null
  private score = 0
  private hp = 100
  private paused = false
  private gameOver = false
  private lastShotAt = 0
  private hudText: Phaser.GameObjects.Text | null = null
  private noticeText: Phaser.GameObjects.Text | null = null
  private hudChrome: Phaser.GameObjects.Graphics | null = null
  private enemyHpUi = new WeakMap<EnemyShip, EnemyHpUi>()
  private restartListenerAdded = false
  private restartKey!: Phaser.Input.Keyboard.Key
  private restartKeyHeld = false
  private hudBannerLine = ''
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true
  private sessionSeed = ''
  private enemyRng!: () => number
  private starRng!: () => number
  private wrapRng!: () => number

  constructor() {
    super('ShooterScene')
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

    const cfg = this.configData ?? {
      gameType: 'retro_shooter' as const,
      theme: 'cyberpunk',
      difficulty: 'medium',
      enemyType: 'drones',
      enemyDensity: 'medium',
      platformDensity: 'medium',
      levelSize: 'medium',
    }
    if (!this.sessionSeed) this.sessionSeed = createSessionSeed()
    this.enemyRng = rngFromString(`${this.sessionSeed}|shooterEnemy`)
    this.starRng = rngFromString(`${this.sessionSeed}|shooterStars`)
    this.wrapRng = rngFromString(`${this.sessionSeed}|shooterWrap`)
    const template = buildPlatformerTemplateFromConfig(cfg, this.sessionSeed)

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
    this.createStarfield(
      this.starRng,
      template.sessionVariant?.shooterStarCount ?? 120,
    )
    this.createPlayer(template.sessionVariant?.shooterPlayerXRatio ?? 0)
    this.createPools()
    this.spawnEnemies(cfg)
    this.registerCollisions()
    this.createHud(cfg)
    attachGlobalInput()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      detachGlobalInput()
      window.removeEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
      window.removeEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)
    })
  }

  update() {
    if (this.gameOver) {
      // Restart reliability: allow both R press and R-hold after win/lose.
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
      this.showNotice(this.paused ? 'Paused' : '')
    }
    if (this.paused) return

    const speed = 280
    const leftDown = Number(this.cursors.left.isDown) + Number(this.leftKey.isDown) + Number(isCodeDown('KeyA'))
    const rightDown = Number(this.cursors.right.isDown) + Number(this.rightKey.isDown) + Number(isCodeDown('KeyD'))
    const upDown = Number(this.cursors.up.isDown) + Number(this.upKey.isDown) + Number(isCodeDown('KeyW'))
    const downDown = Number(this.cursors.down.isDown) + Number(this.downKey.isDown) + Number(isCodeDown('KeyS'))

    const ix = Number(rightDown > 0) - Number(leftDown > 0)
    const iy = Number(downDown > 0) - Number(upDown > 0)
    const keyboardActive = Number(ix !== 0 || iy !== 0)

    if (keyboardActive > 0) {
      const v = new Phaser.Math.Vector2(ix, iy)
      if (v.lengthSq() > 0) v.normalize().scale(speed)
      this.player.setVelocity(v.x, v.y)
    } else {
      this.player.setVelocity(0, 0)
    }

    if (this.shootKey.isDown || this.cursors.space.isDown) {
      this.tryShoot()
    }

    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemyShip
      if (!enemy.active) continue
      enemy.y += enemy.getData('speed') as number
      enemy.x += Math.sin((this.time.now + enemy.getData('phase')) / 300) * 1.8

      const hpUi = this.enemyHpUi.get(enemy)
      if (hpUi) {
        hpUi.text.setPosition(enemy.x, enemy.y - 26)
        hpUi.text.setVisible(this.time.now <= hpUi.hideAt)
      }

      if (enemy.y > this.scale.height + 30) {
        enemy.y = -10
        enemy.x = intBetween(this.wrapRng, 30, this.scale.width - 30)
      }
    }

    for (const child of this.stars.getChildren()) {
      const star = child as Phaser.GameObjects.Arc
      star.y += 0.3 + star.radius * 0.17
      if (star.y > this.scale.height + 3) {
        star.y = -3
        star.x = intBetween(this.wrapRng, 0, this.scale.width)
      }
    }
  }

  private createTextures(primary: number, accent: number) {
    const g = this.make.graphics({ x: 0, y: 0 })

    // Player ship: layered hull + cockpit + thruster glow.
    g.fillStyle(0x04070f, 0.35)
    g.fillEllipse(22, 42, 22, 7)
    g.fillGradientStyle(primary, primary, accent, accent, 1)
    g.fillTriangle(22, 2, 40, 44, 4, 44)
    g.fillStyle(0xffffff, 0.88)
    g.fillTriangle(22, 8, 30, 22, 14, 22)
    g.fillStyle(0x101624, 0.72)
    g.fillRoundedRect(18, 22, 8, 18, 3)
    g.fillStyle(accent, 0.85)
    g.fillRect(16, 39, 4, 5)
    g.fillRect(24, 39, 4, 5)
    g.lineStyle(2, 0x0a0d14, 0.35)
    g.strokeTriangle(22, 2, 40, 44, 4, 44)
    g.generateTexture('shipPlayerTex', 44, 48)

    g.clear()
    g.fillStyle(0x04070f, 0.34)
    g.fillEllipse(20, 26, 24, 7)
    g.fillGradientStyle(0xff4b6f, 0xff4b6f, 0x572de6, 0x572de6, 1)
    g.fillRoundedRect(3, 2, 34, 22, 8)
    g.fillStyle(0xffffff, 0.95)
    g.fillCircle(13, 12, 3)
    g.fillCircle(27, 12, 3)
    g.fillStyle(0x1a2031, 0.74)
    g.fillRoundedRect(12, 15, 16, 5, 2)
    g.lineStyle(2, 0xffffff, 0.2)
    g.strokeRoundedRect(3, 2, 34, 22, 8)
    g.generateTexture('shipEnemyTex', 40, 30)

    g.clear()
    g.fillStyle(0xffffff, 0.97)
    g.fillRoundedRect(2, 0, 4, 20, 2)
    g.fillStyle(accent, 0.7)
    g.fillRoundedRect(3, 4, 2, 12, 1)
    g.generateTexture('laserTex', 8, 20)
    g.destroy()
  }

  private createStarfield(rng: () => number, starCount: number) {
    this.stars = this.add.group()
    const w = this.scale.width
    const h = this.scale.height
    this.add.rectangle(w / 2, h / 2, w, h, 0x080e1d, 0.9)
    this.add.circle(w * 0.2, h * 0.2, 120, 0x4b7cff, 0.16)
    this.add.circle(w * 0.85, h * 0.18, 160, 0xff4caa, 0.13)
    this.add.circle(w * 0.56, h * 0.7, 190, 0x30f0ff, 0.06)

    const grid = this.add.graphics().setDepth(0.5)
    grid.lineStyle(1, 0xffffff, 0.05)
    for (let y = 0; y <= h; y += 28) grid.lineBetween(0, y, w, y)
    for (let x = 0; x <= w; x += 40) grid.lineBetween(x, 0, x, h)

    for (let i = 0; i < starCount; i++) {
      const star = this.add.circle(
        intBetween(rng, 0, this.scale.width),
        intBetween(rng, 0, this.scale.height),
        intBetween(rng, 1, 2),
        0xffffff,
        floatBetween(rng, 0.2, 0.8),
      )
      this.stars.add(star)
    }

    // Subtle top/bottom vignette for depth and readability.
    const vignette = this.add.graphics().setDepth(1.2)
    vignette.fillStyle(0x04070f, 0.22)
    vignette.fillRect(0, 0, w, 26)
    vignette.fillRect(0, h - 36, w, 36)
  }

  private createPlayer(xDriftRatio: number) {
    const x = this.scale.width * (0.5 + xDriftRatio)
    this.player = this.physics.add.image(
      Phaser.Math.Clamp(x, 40, this.scale.width - 40),
      this.scale.height - 70,
      'shipPlayerTex',
    )
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(5)
    this.player.setMaxVelocity(320, 320)
    this.player.setDamping(false)
    this.player.setDrag(0, 0)
  }

  private createPools() {
    this.bullets = this.physics.add.group({ maxSize: 70 })
    this.enemies = this.physics.add.group()
  }

  private spawnEnemies(cfg: GameConfig) {
    const countBase = cfg.enemyDensity === 'low' ? 9 : cfg.enemyDensity === 'high' ? 22 : 15
    const count = cfg.levelSize === 'large' ? countBase + 4 : cfg.levelSize === 'small' ? countBase - 3 : countBase
    const speed = cfg.difficulty === 'hard' ? 2.5 : cfg.difficulty === 'easy' ? 1.4 : 2
    for (let i = 0; i < count; i++) {
      const enemy = this.enemies.create(
        intBetween(this.enemyRng, 35, this.scale.width - 35),
        intBetween(this.enemyRng, -850, -20),
        'shipEnemyTex',
      ) as EnemyShip
      enemy.setData('speed', speed + floatBetween(this.enemyRng, 0, 1.3))
      enemy.setData('phase', floatBetween(this.enemyRng, 0, 1500))
      enemy.setImmovable(true)

      const maxHp = cfg.difficulty === 'hard' ? 4 : cfg.difficulty === 'easy' ? 2 : 3
      const hpText = this.add
        .text(enemy.x, enemy.y - 26, '', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          fontSize: '12px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(12)
        .setVisible(false)

      this.enemyHpUi.set(enemy, {
        text: hpText,
        hideAt: 0,
        hp: maxHp,
        maxHp,
      })
    }
  }

  private registerCollisions() {
    this.physics.add.overlap(this.bullets, this.enemies, (bulletObj, enemyObj) => {
      const bullet = bulletObj as Phaser.Physics.Arcade.Image
      const enemy = enemyObj as EnemyShip
      bullet.disableBody(true, true)
      const hpUi = this.enemyHpUi.get(enemy)
      if (!hpUi) return

      hpUi.hp = Math.max(0, hpUi.hp - 1)
      hpUi.hideAt = this.time.now + 900
      hpUi.text.setText(`HP ${hpUi.hp}/${hpUi.maxHp}`)
      hpUi.text.setVisible(true)

      if (hpUi.hp <= 0) {
        hpUi.text.destroy()
        this.enemyHpUi.delete(enemy)
        enemy.disableBody(true, true)
        this.score += 100
        this.updateHudText()
        if (this.enemies.countActive(true) === 0) {
          this.win()
        }
      }
    })

    this.physics.add.overlap(this.player, this.enemies, (_playerObj, enemyObj) => {
      const enemy = enemyObj as EnemyShip
      const hpUi = this.enemyHpUi.get(enemy)
      if (hpUi) {
        hpUi.text.destroy()
        this.enemyHpUi.delete(enemy)
      }
      enemy.disableBody(true, true)
      this.hp = Math.max(0, this.hp - 20)
      this.cameras.main.shake(120, 0.003)
      this.updateHudText()
      if (this.hp <= 0) {
        this.fail()
      }
    })
  }

  private tryShoot() {
    if (this.time.now - this.lastShotAt < 110) return
    this.lastShotAt = this.time.now
    const bullet = this.bullets.get(this.player.x, this.player.y - 22, 'laserTex') as Phaser.Physics.Arcade.Image | null
    if (!bullet) return
    bullet.enableBody(true, this.player.x, this.player.y - 22, true, true)
    bullet.setActive(true)
    bullet.setVisible(true)
    bullet.setVelocityY(-680)
    bullet.setDepth(7)
    this.time.delayedCall(1600, () => {
      if (bullet.active) bullet.disableBody(true, true)
    })
  }

  private createHud(cfg: GameConfig) {
    const hud = this.add.graphics().setDepth(29).setScrollFactor(0)
    hud.fillStyle(0x070b17, 0.64)
    hud.fillRoundedRect(10, 10, 390, 86, 12)
    hud.lineStyle(1, 0x69e2ff, 0.45)
    hud.strokeRoundedRect(10, 10, 390, 86, 12)
    hud.fillStyle(0xffffff, 0.08)
    hud.fillRect(24, 56, 160, 8)
    hud.fillRect(24, 74, 160, 8)
    this.hudChrome = hud

    this.hudText = this.add
      .text(14, 14, '', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '13px',
        color: '#E5E7EB',
      })
      .setDepth(30)
      .setScrollFactor(0)

    this.noticeText = this.add
      .text(this.scale.width / 2, 16, '', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '18px',
        color: '#F9FAFB',
      })
      .setOrigin(0.5, 0)
      .setDepth(35)
      .setScrollFactor(0)

    this.updateHudText(
      `RETRO SHOOTER // ${cfg.theme.toUpperCase()} // ${cfg.difficulty.toUpperCase()}`,
    )
  }

  private updateHudText(modeLabel?: string) {
    if (!this.hudText) return
    if (modeLabel) this.hudBannerLine = modeLabel
    const label = this.hudBannerLine ? `${this.hudBannerLine}\n` : ''
    const hpNorm = Phaser.Math.Clamp(this.hp / 100, 0, 1)
    const clearNorm =
      1 -
      Phaser.Math.Clamp(this.enemies.countActive(true) / Math.max(1, this.enemies.getLength()), 0, 1)

    if (this.hudChrome) {
      this.hudChrome.clear()
      this.hudChrome.fillStyle(0x070b17, 0.64)
      this.hudChrome.fillRoundedRect(10, 10, 390, 86, 12)
      this.hudChrome.lineStyle(1, 0x69e2ff, 0.45)
      this.hudChrome.strokeRoundedRect(10, 10, 390, 86, 12)
      this.hudChrome.fillStyle(0xffffff, 0.08)
      this.hudChrome.fillRect(24, 56, 160, 8)
      this.hudChrome.fillRect(24, 74, 160, 8)
      this.hudChrome.fillStyle(0x3df28c, 0.92)
      this.hudChrome.fillRect(24, 56, 160 * hpNorm, 8)
      this.hudChrome.fillStyle(0x5ed7ff, 0.92)
      this.hudChrome.fillRect(24, 74, 160 * clearNorm, 8)
    }

    this.hudText.setText(
      `${label}Score ${this.score}   HP ${this.hp}\nEnemies left ${this.enemies.countActive(true)}\nWASD/Arrows or Keyboard Shoot: J/Space`,
    )
  }

  private showNotice(text: string) {
    if (!this.noticeText) return
    this.noticeText.setText(text)
  }

  private win() {
    this.gameOver = true
    this.physics.world.isPaused = true
    this.showNotice('Victory! Press R to play again')
    this.enableRestart()
  }

  private fail() {
    this.gameOver = true
    this.physics.world.isPaused = true
    this.showNotice('Defeated. Press R to retry')
    this.enableRestart()
  }

  private enableRestart() {
    // No-op: restart is handled in `update()` for reliability.
    this.restartListenerAdded = true
  }
}

