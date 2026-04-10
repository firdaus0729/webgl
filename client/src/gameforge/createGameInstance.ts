import Phaser from 'phaser'

import MainScene from './scenes/MainScene'
import ShooterScene from './scenes/ShooterScene'
import TopDownArenaScene from './scenes/TopDownArenaScene'
import type { GameConfig } from './GameConfig'
import type { PlatformerTemplateConfig } from './config'
import { buildPlatformerTemplateFromConfig } from './buildPlatformerTemplateFromConfig'
import { parsePromptToConfig } from './parsePromptToConfig'

export type GameMount = {
  destroy: () => void
}

function getTemplateFromConfig(config: GameConfig): PlatformerTemplateConfig {
  return buildPlatformerTemplateFromConfig(config)
}

function mountGame(gameConfig: GameConfig, host: HTMLElement): GameMount {
  const template = getTemplateFromConfig(gameConfig)

  host.tabIndex = 0
  host.style.outline = 'none'

  const initialWidth = host.clientWidth || 960
  const initialHeight = host.clientHeight || 540

  const baseConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: template.theme.backgroundColor,
    pixelArt: false,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: initialWidth,
      height: initialHeight,
    },
    scene: [],
  }

  const game = new Phaser.Game({
    ...(baseConfig as Phaser.Types.Core.GameConfig),
    parent: host,
  })

  game.scene.add('MainScene', MainScene, false)
  game.scene.add('ShooterScene', ShooterScene, false)
  game.scene.add('TopDownArenaScene', TopDownArenaScene, false)

  const sceneKey =
    gameConfig.gameType === 'top_down_arena'
      ? 'TopDownArenaScene'
      : gameConfig.gameType === 'retro_shooter'
        ? 'ShooterScene'
        : 'MainScene'
  game.scene.start(sceneKey, { config: gameConfig })

  window.setTimeout(() => host.focus(), 0)

  const ro = new ResizeObserver(() => {
    const width = host.clientWidth
    const height = host.clientHeight
    if (width > 0 && height > 0) game.scale.resize(width, height)
  })
  ro.observe(host)

  const captureKeys = new Set([
    'a',
    'd',
    'w',
    's',
    ' ',
    'arrowup',
    'arrowdown',
    'arrowleft',
    'arrowright',
    'j',
    'p',
  ])

  const onWindowKeyDown = (e: KeyboardEvent) => {
    if (captureKeys.has(e.key.toLowerCase())) {
      e.preventDefault()
    }
  }
  window.addEventListener('keydown', onWindowKeyDown, { passive: false })

  // Mouse intentionally disabled (keyboard-only gameplay).

  // Make sure Phaser consumes movement keys consistently.
  game.input.keyboard?.addCapture([
    Phaser.Input.Keyboard.KeyCodes.A,
    Phaser.Input.Keyboard.KeyCodes.D,
    Phaser.Input.Keyboard.KeyCodes.W,
    Phaser.Input.Keyboard.KeyCodes.S,
    Phaser.Input.Keyboard.KeyCodes.SPACE,
    Phaser.Input.Keyboard.KeyCodes.UP,
    Phaser.Input.Keyboard.KeyCodes.DOWN,
    Phaser.Input.Keyboard.KeyCodes.LEFT,
    Phaser.Input.Keyboard.KeyCodes.RIGHT,
    Phaser.Input.Keyboard.KeyCodes.J,
    Phaser.Input.Keyboard.KeyCodes.P,
    Phaser.Input.Keyboard.KeyCodes.R,
  ])

  // Mouse input intentionally disabled (keyboard-only gameplay).

  return {
    destroy: () => {
      ro.disconnect()
      window.removeEventListener('keydown', onWindowKeyDown)
      game.destroy(true)
    },
  }
}

export function mountGameFromPrompt(prompt: string, host: HTMLElement): GameMount {
  const cleanedPrompt = (prompt ?? '').trim() || 'A classic platformer'
  const gameConfig = parsePromptToConfig(cleanedPrompt)
  return mountGame(gameConfig, host)
}

export function mountGameFromConfig(config: GameConfig, host: HTMLElement): GameMount {
  return mountGame(config, host)
}

