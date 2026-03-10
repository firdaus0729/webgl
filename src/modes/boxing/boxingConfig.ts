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
    move_forward: ['w'],
    move_back: ['s'],
    attack_primary: ['j', 'Mouse0'],
    attack_secondary: ['k'],
    block: ['l'],
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
    ringDepth: 10,
    playerPrefabId: 'boxer_player',
    opponentPrefabId: 'boxer_ai',
    aiStyle: 'aggressive',
    pace: 'fast',
    theme: 'neon',
    jabDamage: 8,
    strongDamage: 18,
    jabCooldown: 0.25,
    strongCooldown: 0.6,
    blockDamageMultiplier: 0.3,
    staminaMax: 100,
    staminaRegen: 8,
    jabStaminaCost: 5,
    strongStaminaCost: 18,
    blockStaminaDrainAfterSec: 3,
    blockStaminaDrainPerSec: 12,
  },
};
