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
import { emitEnemyDefeat, screenShake } from '../nintendo/GameJuice'
import { createShooterBackground, RETRO_HUD_FONT } from '../nintendo/ModeBackgrounds'
import { createShooterTextures, getNintendoPalette } from '../nintendo/ModeSprites'
import { playSfx } from '../nintendo/ChiptuneAudio'

type EnemyShip = Phaser.Physics.Arcade.Image

const START_LIVES = 3
const INVINCIBLE_MS = 1400
const KILL_SCORE = 150

export default class ShooterScene extends Phaser.Scene {
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
  private stars!: Phaser.GameObjects.Group
  private configData: GameConfig | null = null
  private theme: GameConfig['theme'] = 'cartoon'
  private score = 0
  private lives = START_LIVES
  private paused = false
  private gameOver = false
  private lastShotAt = 0
  private invincibleUntil = 0
  private hudText: Phaser.GameObjects.Text | null = null
  private noticeText: Phaser.GameObjects.Text | null = null
  private restartKeyHeld = false
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true
  private sessionSeed = ''
  private enemyRng!: () => number
  private wrapRng!: () => number
  private texKeys!: ReturnType<typeof createShooterTextures>
  private totalEnemies = 0

  constructor() {
    super('ShooterScene')
  }

  init(data?: { config?: GameConfig; sessionSeed?: string }) {
    this.configData = data?.config ?? null
    if (data?.sessionSeed) this.sessionSeed = data.sessionSeed
  }

  create() {
    this.score = 0
    this.lives = START_LIVES
    this.paused = false
    this.gameOver = false
    this.lastShotAt = 0
    this.invincibleUntil = 0

    const cfg = this.configData ?? {
      gameType: 'retro_shooter' as const,
      theme: 'cartoon' as const,
      difficulty: 'medium' as const,
      enemyType: 'aliens' as const,
      enemyDensity: 'medium' as const,
      platformDensity: 'medium' as const,
      levelSize: 'medium' as const,
    }
    this.configData = cfg
    this.theme = cfg.theme
    if (!this.sessionSeed) this.sessionSeed = createSessionSeed()
    this.enemyRng = rngFromString(`${this.sessionSeed}|shooterEnemy`)
    this.wrapRng = rngFromString(`${this.sessionSeed}|shooterWrap`)
    const template = buildPlatformerTemplateFromConfig(cfg, this.sessionSeed)

    this.bindRestartKeys()
    this.texKeys = createShooterTextures(this, cfg.theme)
    this.stars = createShooterBackground(
      this,
      cfg.theme,
      this.sessionSeed,
      template.sessionVariant?.shooterStarCount ?? 100,
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

  private bindRestartKeys() {
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
      if (this.paused) playSfx('pause')
      this.showNotice(this.paused ? '⏸ PAUSED' : '')
    }
    if (this.paused) return

    const speed = 300
    const leftDown =
      Number(this.cursors.left.isDown) + Number(this.leftKey.isDown) + Number(isCodeDown('KeyA'))
    const rightDown =
      Number(this.cursors.right.isDown) + Number(this.rightKey.isDown) + Number(isCodeDown('KeyD'))
    const upDown =
      Number(this.cursors.up.isDown) + Number(this.upKey.isDown) + Number(isCodeDown('KeyW'))
    const downDown =
      Number(this.cursors.down.isDown) + Number(this.downKey.isDown) + Number(isCodeDown('KeyS'))

    const ix = Number(rightDown > 0) - Number(leftDown > 0)
    const iy = Number(downDown > 0) - Number(upDown > 0)
    if (ix !== 0 || iy !== 0) {
      const v = new Phaser.Math.Vector2(ix, iy).normalize().scale(speed)
      this.player.setVelocity(v.x, v.y)
    } else {
      this.player.setVelocity(0, 0)
    }

    if (this.shootKey.isDown || this.cursors.space.isDown) this.tryShoot()

    const t = this.time.now
    for (const child of this.enemies.getChildren()) {
      const enemy = child as EnemyShip
      if (!enemy.active) continue
      enemy.y += enemy.getData('speed') as number
      enemy.x += Math.sin((t + (enemy.getData('phase') as number)) / 280) * 2.2
      enemy.setScale(0.9 + Math.sin(t * 0.008 + (enemy.getData('phase') as number)) * 0.06, 1)

      if (enemy.y > this.scale.height + 30) {
        enemy.y = -10
        enemy.x = intBetween(this.wrapRng, 30, this.scale.width - 30)
      }
    }

    for (const child of this.stars.getChildren()) {
      const star = child as Phaser.GameObjects.Arc
      star.y += 0.4 + star.radius * 0.2
      if (star.y > this.scale.height + 3) {
        star.y = -3
        star.x = intBetween(this.wrapRng, 0, this.scale.width)
      }
    }

    this.updateInvincibility()
    this.updateHud()
  }

  private createPlayer(xDriftRatio: number) {
    const x = this.scale.width * (0.5 + xDriftRatio)
    this.player = this.physics.add.image(
      Phaser.Math.Clamp(x, 40, this.scale.width - 40),
      this.scale.height - 70,
      this.texKeys.player,
    )
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(5)
    this.player.setMaxVelocity(340, 340)
  }

  private createPools() {
    this.bullets = this.physics.add.group({ maxSize: 70 })
    this.enemies = this.physics.add.group()
  }

  private spawnEnemies(cfg: GameConfig) {
    const countBase = cfg.enemyDensity === 'low' ? 10 : cfg.enemyDensity === 'high' ? 24 : 16
    const count =
      cfg.levelSize === 'large' ? countBase + 5 : cfg.levelSize === 'small' ? countBase - 3 : countBase
    this.totalEnemies = count
    const speed = cfg.difficulty === 'hard' ? 2.8 : cfg.difficulty === 'easy' ? 1.3 : 2.1
    const hp = cfg.difficulty === 'hard' ? 3 : cfg.difficulty === 'easy' ? 1 : 2

    for (let i = 0; i < count; i++) {
      const enemy = this.enemies.create(
        intBetween(this.enemyRng, 35, this.scale.width - 35),
        intBetween(this.enemyRng, -900, -20),
        this.texKeys.enemy,
      ) as EnemyShip
      enemy.setData('speed', speed + floatBetween(this.enemyRng, 0, 1.2))
      enemy.setData('phase', floatBetween(this.enemyRng, 0, 1500))
      enemy.setData('hp', hp)
      enemy.setImmovable(true)
      enemy.setScale(1.15)
    }
  }

  private registerCollisions() {
    const pal = getNintendoPalette(this.theme)

    this.physics.add.overlap(this.bullets, this.enemies, (bulletObj, enemyObj) => {
      const bullet = bulletObj as Phaser.Physics.Arcade.Image
      const enemy = enemyObj as EnemyShip
      bullet.disableBody(true, true)
      const hp = ((enemy.getData('hp') as number) ?? 1) - 1
      enemy.setData('hp', hp)
      enemy.setTint(0xffffff)
      this.time.delayedCall(50, () => enemy.active && enemy.clearTint())

      if (hp <= 0) {
        emitEnemyDefeat(this, enemy.x, enemy.y, pal)
        enemy.disableBody(true, true)
        this.score += KILL_SCORE
        if (this.enemies.countActive(true) === 0) this.win()
      }
    })

    this.physics.add.overlap(this.player, this.enemies, (_p, enemyObj) => {
      if (this.time.now < this.invincibleUntil) return
      const enemy = enemyObj as EnemyShip
      enemy.disableBody(true, true)
      emitEnemyDefeat(this, enemy.x, enemy.y, pal)
      this.lives--
      playSfx('hurt')
      screenShake(this, 0.005, 100)
      this.invincibleUntil = this.time.now + INVINCIBLE_MS
      this.showNotice(this.lives > 0 ? `HIT! ♥×${this.lives}` : '')
      if (this.lives <= 0) this.fail()
    })
  }

  private tryShoot() {
    if (this.time.now - this.lastShotAt < 130) return
    this.lastShotAt = this.time.now
    playSfx('shoot')
    const bullet = this.bullets.get(
      this.player.x,
      this.player.y - 18,
      this.texKeys.laser,
    ) as Phaser.Physics.Arcade.Image | null
    if (!bullet) return
    bullet.enableBody(true, this.player.x, this.player.y - 18, true, true)
    bullet.setActive(true).setVisible(true).setVelocityY(-720).setDepth(7)
    this.time.delayedCall(1500, () => bullet.active && bullet.disableBody(true, true))
  }

  private updateInvincibility() {
    if (this.time.now >= this.invincibleUntil) {
      this.player.clearTint()
      this.player.setAlpha(1)
      return
    }
    this.player.setAlpha(Math.sin(this.time.now * 0.025) > 0 ? 1 : 0.35)
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
      .setDepth(30)
      .setScrollFactor(0)

    this.noticeText = this.add
      .text(this.scale.width / 2, this.scale.height * 0.38, '', {
        fontFamily: RETRO_HUD_FONT,
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(35)
      .setScrollFactor(0)

    this.updateHud()
  }

  private updateHud() {
    if (!this.hudText) return
    const left = this.enemies.countActive(true)
    const world = this.theme.toUpperCase().slice(0, 3)
    this.hudText.setText(
      [
        `★ ${this.score}   ♥×${this.lives}   👾 ${left}/${this.totalEnemies}`,
        `${world}-SKY   ${this.configData?.difficulty.toUpperCase() ?? 'MED'}`,
        'WASD Move · J/Space Shoot',
      ].join('\n'),
    )
  }

  private showNotice(text: string) {
    if (this.noticeText) this.noticeText.setText(text)
  }

  private win() {
    this.gameOver = true
    this.physics.world.isPaused = true
    playSfx('win')
    this.cameras.main.flash(300, 255, 255, 180, false)
    this.showNotice('🚀 SECTOR CLEAR!\nPRESS R TO PLAY AGAIN')
  }

  private fail() {
    this.gameOver = true
    this.physics.world.isPaused = true
    playSfx('lose')
    this.showNotice('💥 SHOT DOWN!\nPRESS R TO RETRY')
  }
}
