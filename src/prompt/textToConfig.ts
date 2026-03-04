import type { GameModeId } from '../core2d/Types';
import type { GameModeConfig } from '../core2d/GameModeConfig';
import type { BoxingConfig, TopdownArenaConfig, EndlessRunnerConfig, GridBoardConfig } from '../core2d/GameModeConfig';
import { boxingDefaultConfig } from '../modes/boxing/boxingConfig';
import { arenaDefaultConfig } from '../modes/topdownArena/arenaConfig';
import { runnerDefaultConfig } from '../modes/endlessRunner/runnerConfig';
import { gridDefaultConfig } from '../modes/gridBoard/gridConfig';

export interface PromptInput {
  template: GameModeId;
  text: string;
}

function parseBoxingTraits(text: string): Partial<BoxingConfig> {
  const lower = text.toLowerCase();
  const traits: Partial<BoxingConfig> = {};
  if (/\b(fast|aggressive|quick)\b/.test(lower)) {
    traits.pace = 'fast';
    traits.aiStyle = 'aggressive';
  }
  if (/\b(slow|defensive|patient)\b/.test(lower)) {
    traits.pace = 'slow';
    traits.aiStyle = 'defensive';
  }
  if (/\b(neon|cyber|glow)\b/.test(lower)) traits.theme = 'neon';
  if (/\b(jungle|forest|green)\b/.test(lower)) traits.theme = 'jungle';
  if (/\b(arena|ring)\b/.test(lower)) traits.theme = traits.theme ?? 'arena';
  return traits;
}

function parseArenaTraits(text: string): Partial<TopdownArenaConfig> {
  const lower = text.toLowerCase();
  const traits: Partial<TopdownArenaConfig> = {};
  if (/\b(chaos|many|lots)\b/.test(lower)) traits.spawnInterval = 1.2;
  if (/\b(slow|easy)\b/.test(lower)) {
    traits.spawnInterval = 4;
    traits.enemySpeed = 2;
  }
  if (/\b(big|large|huge)\b/.test(lower)) traits.arenaRadius = 16;
  return traits;
}

function parseRunnerTraits(text: string): Partial<EndlessRunnerConfig> {
  const lower = text.toLowerCase();
  const traits: Partial<EndlessRunnerConfig> = {};
  if (/\b(fast|quick)\b/.test(lower)) traits.baseSpeed = 12;
  if (/\b(slow|easy)\b/.test(lower)) traits.baseSpeed = 5;
  if (/\b(hard|tough)\b/.test(lower)) traits.spawnInterval = 0.8;
  return traits;
}

function parseGridTraits(text: string): Partial<GridBoardConfig> {
  const lower = text.toLowerCase();
  const traits: Partial<GridBoardConfig> = {};
  if (/\b(big|large)\b/.test(lower)) {
    traits.rows = 8;
    traits.cols = 9;
  }
  if (/\b(easy)\b/.test(lower)) traits.humanStarts = true;
  return traits;
}

export function textToConfig(input: PromptInput): GameModeConfig {
  const text = input.text.trim();
  switch (input.template) {
    case 'boxing': {
      const base = { ...boxingDefaultConfig };
      const overrides = parseBoxingTraits(text);
      if (base.boxing) base.boxing = { ...base.boxing, ...overrides };
      return base;
    }
    case 'topdown_arena': {
      const base = { ...arenaDefaultConfig };
      const overrides = parseArenaTraits(text);
      if (base.topdownArena) base.topdownArena = { ...base.topdownArena, ...overrides };
      return base;
    }
    case 'endless_runner': {
      const base = { ...runnerDefaultConfig };
      const overrides = parseRunnerTraits(text);
      if (base.endlessRunner) base.endlessRunner = { ...base.endlessRunner, ...overrides };
      return base;
    }
    case 'grid_board': {
      const base = { ...gridDefaultConfig };
      const overrides = parseGridTraits(text);
      if (base.gridBoard) base.gridBoard = { ...base.gridBoard, ...overrides };
      return base;
    }
    default:
      return boxingDefaultConfig;
  }
}
