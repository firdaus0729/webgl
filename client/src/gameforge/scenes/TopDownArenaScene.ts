import Phaser from 'phaser'

import type { GameConfig } from '../GameConfig'
import { buildPlatformerTemplateFromConfig } from '../buildPlatformerTemplateFromConfig'
import { attachGlobalInput, detachGlobalInput, isCodeDown } from '../inputState'
import { createSessionSeed, intBetween, rngFromString } from '../sessionSeed'
import { emitEnemyDefeat, screenShake } from '../nintendo/GameJuice'
import { createArenaBackground, RETRO_HUD_FONT } from '../nintendo/ModeBackgrounds'
import { createArenaTextures, getNintendoPalette } from '../nintendo/ModeSprites'
import { playSfx } from '../nintendo/ChiptuneAudio'

type ArenaEnemy = Phaser.Physics.Arcade.Image & { hp: number; maxHp: number }

const START_LIVES = 3
const INVINCIBLE_MS = 900
const KILL_SCORE = 120

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
  private aimX = 0
  private aimY = -1
  private onGlobalRestartKeyDown = (_e: KeyboardEvent) => {}
  private onGlobalRestartKeyUp = (_e: KeyboardEvent) => {}
  private readonly restartCaptureOptions = true
  private arenaPad = 48
  private totalSpawned = 0
  private targetKills = 0
  private kills = 0
  private sessionSeed = ''
  private arenaMoveMul = 1
  private texKeys!: ReturnType<typeof createArenaTextures>

  constructor() {
    super('TopDownArenaScene')
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
    this.kills = 0
    this.totalSpawned = 0
    this.aimX = 0
    this.aimY = -1

    const cfg = this.configData ?? {
      gameType: 'top_down_arena' as const,
      theme: 'cartoon' as const,
      difficulty: 'medium' as const,
      enemyType: 'drones' as const,
      enemyDensity: 'medium' as const,
      platformDensity: 'medium' as const,
      levelSize: 'medium' as const,
    }
    this.configData = cfg
    this.theme = cfg.theme
    if (!this.sessionSeed) this.sessionSeed = createSessionSeed()
    const template = buildPlatformerTemplateFromConfig(cfg, this.sessionSeed)
    this.arenaMoveMul = template.sessionVariant?.arenaPlayerSpeedMul ?? 1

    this.bindRestartKeys()
    this.texKeys = createArenaTextures(this, cfg.theme, cfg.enemyType)
    createArenaBackground(this, cfg.theme)
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

  private computeWaveTargets(cfg: GameConfig, killMul: number) {
    const base = cfg.enemyDensity === 'low' ? 10 : cfg.enemyDensity === 'high' ? 24 : 16
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

    const speedBase = cfg.difficulty === 'hard' ? 100 : cfg.difficulty === 'easy' ? 58 : 78

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

      const enemy = this.enemies.create(x, y, this.texKeys.enemy) as ArenaEnemy
      enemy.setImmovable(true).setScale(1.1)
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
      if (this.paused) playSfx('pause')
      this.showNotice(this.paused ? '⏸ PAUSED' : '')
    }
    if (this.paused) return

    const speed = 310 * this.arenaMoveMul
    const ix =
      Number(this.cursors.right.isDown || this.rightKey.isDown || isCodeDown('KeyD')) -
      Number(this.cursors.left.isDown || this.leftKey.isDown || isCodeDown('KeyA'))
    const iy =
      Number(this.cursors.down.isDown || this.downKey.isDown || isCodeDown('KeyS')) -
      Number(this.cursors.up.isDown || this.upKey.isDown || isCodeDown('KeyW'))

    const v = new Phaser.Math.Vector2(ix, iy)
    if (v.lengthSq() > 0) {
      v.normalize().scale(speed)
      this.player.setVelocity(v.x, v.y)
      this.aimX = v.x
      this.aimY = v.y
    } else {
      this.player.setVelocity(0, 0)
    }

    if (this.shootKey.isDown || this.cursors.space.isDown) this.tryShoot()

    const pad = this.arenaPad
    this.player.x = Phaser.Math.Clamp(this.player.x, pad, this.scale.width - pad)
    this.player.y = Phaser.Math.Clamp(this.player.y, pad, this.scale.height - pad)

    const cfg = this.configData
    if (!cfg) return

    const t = this.time.now
    for (const child of this.enemies.getChildren()) {
      const enemy = child as ArenaEnemy
      if (!enemy.active) continue
      const ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
      const sp = enemy.getData('speed') as number
      enemy.setVelocity(Math.cos(ang) * sp, Math.sin(ang) * sp)
      enemy.setScale(1.1 + Math.sin(t * 0.01 + enemy.x) * 0.05)
    }

    if (
      this.enemies.countActive(true) === 0 &&
      this.kills < this.targetKills &&
      this.totalSpawned < this.targetKills
    ) {
      this.spawnWave(cfg)
    }

    if (this.kills >= this.targetKills && this.enemies.countActive(true) === 0) this.win()

    this.updateInvincibility()
    this.updateHud()
  }

  private createPlayer() {
    this.player = this.physics.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      this.texKeys.player,
    )
    this.player.setCollideWorldBounds(true).setDepth(6).setMaxVelocity(420, 420).setScale(1.15)
  }

  private createPools() {
    this.bullets = this.physics.add.group({ maxSize: 90 })
    this.enemies = this.physics.add.group()
  }

  private tryShoot() {
    if (this.time.now - this.lastShotAt < 110) return
    this.lastShotAt = this.time.now
    playSfx('shoot')

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

    const bx = this.player.x + ax * 20
    const by = this.player.y + ay * 20
    const bullet = this.bullets.get(bx, by, this.texKeys.bullet) as Phaser.Physics.Arcade.Image | null
    if (!bullet) return
    bullet.enableBody(true, bx, by, true, true).setActive(true).setVisible(true).setDepth(8)
    bullet.setVelocity(ax * 740, ay * 740)
    this.time.delayedCall(1300, () => bullet.active && bullet.disableBody(true, true))
  }

  private registerCollisions() {
    const pal = getNintendoPalette(this.theme)

    this.physics.add.overlap(this.bullets, this.enemies, (bulletObj, enemyObj) => {
      const bullet = bulletObj as Phaser.Physics.Arcade.Image
      const enemy = enemyObj as ArenaEnemy
      bullet.disableBody(true, true)
      enemy.hp -= 1
      enemy.setTint(0xffffff)
      this.time.delayedCall(40, () => enemy.active && enemy.clearTint())

      if (enemy.hp <= 0) {
        emitEnemyDefeat(this, enemy.x, enemy.y, pal)
        enemy.disableBody(true, true)
        this.kills += 1
        this.score += KILL_SCORE
        screenShake(this, 0.003, 50)
      }
    })

    this.physics.add.overlap(this.player, this.enemies, () => {
      if (this.gameOver || this.time.now < this.invincibleUntil) return
      this.lives--
      playSfx('hurt')
      screenShake(this, 0.005, 90)
      this.invincibleUntil = this.time.now + INVINCIBLE_MS
      if (this.lives <= 0) this.fail()
    })
  }

  private updateInvincibility() {
    if (this.time.now >= this.invincibleUntil) {
      this.player.clearTint()
      this.player.setAlpha(1)
      return
    }
    this.player.setAlpha(Math.sin(this.time.now * 0.028) > 0 ? 1 : 0.35)
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
    const world = this.theme.toUpperCase().slice(0, 3)
    this.hudText.setText(
      [
        `★ ${this.score}   ♥×${this.lives}   ⚔ ${this.kills}/${this.targetKills}`,
        `${world}-ARENA   👾 ${this.enemies.countActive(true)} active`,
        'WASD Move · J/Space Fire · Aim = move dir',
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
    this.cameras.main.flash(280, 255, 255, 160, false)
    this.showNotice('⚔ ARENA CLEARED!\nPRESS R TO RESTART')
  }

  private fail() {
    this.gameOver = true
    this.physics.world.isPaused = true
    playSfx('lose')
    this.showNotice('💀 DEFEATED!\nPRESS R TO RETRY')
  }
}
