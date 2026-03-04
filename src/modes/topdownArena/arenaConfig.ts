import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { InputMapping } from '../../core2d/Input';

export const arenaDefaultConfig: GameModeConfig = {
  camera: {
    mode: 'topdown',
    followTag: 'player',
  },
  inputMapping: {
    move_left: ['ArrowLeft', 'a'],
    move_right: ['ArrowRight', 'd'],
    move_up: ['ArrowUp', 'w'],
    move_down: ['ArrowDown', 's'],
    attack_primary: ['Mouse0', ' '],
    pause: ['Escape'],
  } as InputMapping,
  physics: {
    gravity: { x: 0, y: 0 },
    maxSpeed: 12,
  },
  rules: {
    timeLimit: 120,
    targetScore: 10,
  },
  topdownArena: {
    arenaRadius: 12,
    playerSpeed: 8,
    bulletSpeed: 18,
    spawnInterval: 2.5,
    enemySpeed: 4,
  },
};
