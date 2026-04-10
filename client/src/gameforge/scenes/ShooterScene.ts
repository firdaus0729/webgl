import Phaser from 'phaser'

import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'

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

  constructor() {
    super('ShooterScene')
  }

  init(data?: { config?: GameConfig }) {
    this.configData = data?.config ?? null
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
    const template = buildPlatformerTemplateFromConfig(cfg)

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
      this.scene.restart({ config: this.configData })
    }
    this.onGlobalRestartKeyUp = (e: KeyboardEvent) => {
      const isR = e.code === 'KeyR' || e.key === 'r' || e.key === 'R'
      if (!isR) return
      this.restartKeyHeld = false
    }
    window.addEventListener('keydown', this.onGlobalRestartKeyDown, this.restartCaptureOptions)
    window.addEventListener('keyup', this.onGlobalRestartKeyUp, this.restartCaptureOptions)

    this.createTextures(template.theme.playerFill, template.theme.platformStroke)
    this.createStarfield()
    this.createPlayer()
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
        this.scene.restart({ config: this.configData })
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
        enemy.x = Phaser.Math.Between(30, this.scale.width - 30)
      }
    }

    for (const child of this.stars.getChildren()) {
      const star = child as Phaser.GameObjects.Arc
      star.y += 0.3 + star.radius * 0.17
      if (star.y > this.scale.height + 3) {
        star.y = -3
        star.x = Phaser.Math.Between(0, this.scale.width)
      }
    }
  }

  private createTextures(primary: number, accent: number) {
    const g = this.make.graphics({ x: 0, y: 0 })

    g.fillGradientStyle(primary, primary, accent, accent, 1)
    g.fillTriangle(14, 0, 28, 36, 0, 36)
    g.fillStyle(0xffffff, 0.8)
    g.fillCircle(14, 17, 4)
    g.fillStyle(accent, 0.9)
    g.fillRoundedRect(11, 16, 6, 18, 2)
    g.generateTexture('shipPlayerTex', 28, 34)

    g.clear()
    g.fillGradientStyle(0xff4b6f, 0xff4b6f, 0x572de6, 0x572de6, 1)
    g.fillRoundedRect(0, 0, 32, 25, 8)
    g.fillStyle(0xffffff, 0.95)
    g.fillCircle(9, 12, 3)
    g.fillCircle(23, 12, 3)
    g.generateTexture('shipEnemyTex', 30, 24)

    g.clear()
    g.fillStyle(0xffffff, 0.95)
    g.fillRoundedRect(0, 0, 5, 18, 2)
    g.generateTexture('laserTex', 5, 18)
    g.destroy()
  }

  private createStarfield() {
    this.stars = this.add.group()
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x0b1020,
      0.82,
    )
    this.add.circle(this.scale.width * 0.2, this.scale.height * 0.2, 90, 0x4b7cff, 0.15)
    this.add.circle(this.scale.width * 0.85, this.scale.height * 0.18, 120, 0xff4caa, 0.12)
    for (let i = 0; i < 120; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.2, 0.8),
      )
      this.stars.add(star)
    }
  }

  private createPlayer() {
    this.player = this.physics.add.image(
      this.scale.width / 2,
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
        Phaser.Math.Between(35, this.scale.width - 35),
        Phaser.Math.Between(-850, -20),
        'shipEnemyTex',
      ) as EnemyShip
      enemy.setData('speed', speed + Math.random() * 1.3)
      enemy.setData('phase', Math.random() * 1500)
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

