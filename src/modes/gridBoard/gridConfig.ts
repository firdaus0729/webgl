import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { InputMapping } from '../../core2d/Input';

export const gridDefaultConfig: GameModeConfig = {
  camera: {
    mode: 'static_grid',
    followTag: undefined,
  },
  inputMapping: {
    move_left: ['ArrowLeft', 'a'],
    move_right: ['ArrowRight', 'd'],
    confirm: ['Enter', ' '],
    pause: ['Escape'],
  } as InputMapping,
  physics: {
    gravity: { x: 0, y: 0 },
    maxSpeed: 0,
  },
  rules: {},
  gridBoard: {
    rows: 6,
    cols: 7,
    connectN: 4,
    humanStarts: true,
  },
};
