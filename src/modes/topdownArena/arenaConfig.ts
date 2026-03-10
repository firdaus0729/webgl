import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { InputMapping } from '../../core2d/Input';

export const arenaDefaultConfig: GameModeConfig = {
  camera: {
    mode: 'topdown',
    followTag: 'player',
  },
  inputMapping: {
    move_left: ['a'],
    move_right: ['d'],
    move_up: ['w'],
    move_down: ['s'],
    attack_primary: [' ', 'Mouse0'],
    pause: ['Escape'],
  } as InputMapping,
  physics: {
    gravity: { x: 0, y: 0 },
    maxSpeed: 14,
  },
  rules: {
    endless: false,
  },
  topdownArena: {
    arenaRadius: 14,
    playerSpeed: 8,
    bulletSpeed: 18,
    fireInterval: 0.3,
    spawnInterval: 2.5,
    enemySpeed: 3.5,
    enemyHealth: 2,
    scorePerKill: 100,
  },
};
