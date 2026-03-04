import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { InputMapping } from '../../core2d/Input';

export const boxingDefaultConfig: GameModeConfig = {
  camera: {
    mode: 'side',
    followTag: 'player',
  },
  inputMapping: {
    move_left: ['ArrowLeft', 'a'],
    move_right: ['ArrowRight', 'd'],
    attack_primary: ['j', 'Mouse0'],
    attack_secondary: ['k'],
    pause: ['Escape'],
  } as InputMapping,
  physics: {
    gravity: { x: 0, y: 0 },
    maxSpeed: 6,
  },
  rules: {
    timeLimit: 90,
    targetScore: 1,
  },
  boxing: {
    ringWidth: 20,
    playerPrefabId: 'boxer_player',
    opponentPrefabId: 'boxer_ai',
    aiStyle: 'aggressive',
    pace: 'fast',
    theme: 'neon',
  },
};
