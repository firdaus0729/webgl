import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { InputMapping } from '../../core2d/Input';

export const runnerDefaultConfig: GameModeConfig = {
  camera: {
    mode: 'endless',
    followTag: 'player',
  },
  inputMapping: {
    move_left: ['ArrowLeft', 'a'],
    move_right: ['ArrowRight', 'd'],
    pause: ['Escape'],
  } as InputMapping,
  physics: {
    gravity: { x: 0, y: 0 },
    maxSpeed: 10,
  },
  rules: {
    endless: true,
  },
  endlessRunner: {
    laneCount: 3,
    baseSpeed: 8,
    laneSpacing: 2.5,
    spawnInterval: 1.2,
  },
};
