import type { Vec2 } from './Types';
import type { InputMapping } from './Input';
import type { CameraMode } from './Camera2D';

export interface GameModeConfig {
  camera: {
    mode: CameraMode;
    followTag?: string;
  };
  inputMapping: InputMapping;
  physics: {
    gravity: Vec2;
    maxSpeed: number;
  };
  rules: {
    timeLimit?: number;
    targetScore?: number;
    endless?: boolean;
  };
  boxing?: BoxingConfig;
  platformer?: PlatformerConfig;
  topdownArena?: TopdownArenaConfig;
  endlessRunner?: EndlessRunnerConfig;
  gridBoard?: GridBoardConfig;
}

export interface TopdownArenaConfig {
  arenaRadius: number;
  playerSpeed: number;
  bulletSpeed: number;
  fireInterval: number;
  spawnInterval: number;
  enemySpeed: number;
  enemyHealth: number;
  scorePerKill: number;
}

export interface PlatformerConfig {
  gravityY: number;
  jumpForce: number;
  moveSpeed: number;
  levelWidth: number;
  levelHeight: number;
  coinPoints?: number;
  starPoints?: number;
}

export interface BoxingConfig {
  ringWidth: number;
  /** Arena depth (Y extent); boxers cannot leave the rectangle. */
  ringDepth?: number;
  playerPrefabId: string;
  opponentPrefabId: string;
  aiStyle: 'defensive' | 'balanced' | 'aggressive';
  pace: 'slow' | 'medium' | 'fast';
  theme: string;
  /** Damage for jab (quick punch) */
  jabDamage?: number;
  /** Damage for strong punch */
  strongDamage?: number;
  /** Cooldown in seconds before next jab */
  jabCooldown?: number;
  /** Cooldown in seconds before next strong punch */
  strongCooldown?: number;
  /** Multiplier when victim is blocking (0 = no damage, 1 = full). 0.3 = 70% reduction. */
  blockDamageMultiplier?: number;
  /** Max stamina per fighter */
  staminaMax?: number;
  /** Stamina regen per second */
  staminaRegen?: number;
  /** Stamina cost for jab */
  jabStaminaCost?: number;
  /** Stamina cost for strong punch */
  strongStaminaCost?: number;
  /** Seconds of blocking before stamina starts draining */
  blockStaminaDrainAfterSec?: number;
  /** Stamina drained per second while blocking past the threshold */
  blockStaminaDrainPerSec?: number;
}

export interface EndlessRunnerConfig {
  laneCount: number;
  baseSpeed: number;
  laneSpacing: number;
  spawnInterval: number;
}

export interface GridBoardConfig {
  rows: number;
  cols: number;
  connectN: number;
  humanStarts: boolean;
}
