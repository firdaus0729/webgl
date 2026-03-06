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
  topdownArena?: TopdownArenaConfig;
  endlessRunner?: EndlessRunnerConfig;
  gridBoard?: GridBoardConfig;
}

export interface BoxingConfig {
  ringWidth: number;
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
  /** Multiplier when victim is blocking (0 = no damage, 1 = full) */
  blockDamageMultiplier?: number;
}

export interface TopdownArenaConfig {
  arenaRadius: number;
  playerSpeed: number;
  bulletSpeed: number;
  spawnInterval: number;
  enemySpeed: number;
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
