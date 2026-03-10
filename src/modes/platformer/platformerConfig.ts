import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { InputMapping } from '../../core2d/Input';

export const platformerDefaultConfig: GameModeConfig = {
  camera: {
    mode: 'side',
    followTag: 'player',
  },
  inputMapping: {
    move_left: ['ArrowLeft', 'a'],
    move_right: ['ArrowRight', 'd'],
    jump: [' ', 'ArrowUp', 'w'],
    pause: ['Escape'],
  } as InputMapping,
  physics: {
    gravity: { x: 0, y: -28 },
    maxSpeed: 14,
  },
  rules: {
    endless: false,
  },
  platformer: {
    gravityY: -28,
    jumpForce: 12,
    moveSpeed: 7,
    levelWidth: 60,
    levelHeight: 16,
    coinPoints: 10,
    starPoints: 50,
  },
};
