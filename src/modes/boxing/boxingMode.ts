import type { GameMode } from '../../core2d/Engine2D';
import type { World } from '../../core2d/World';
import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { ModeServices } from '../../core2d/Engine2D';
import { boxingDefaultConfig } from './boxingConfig';
import { spawnFromPrefab } from './boxingPrefabs';
import { registerBoxingBehaviors, resetBoxingBehaviorState } from './boxingBehaviors';
import {
  getBoxingFightElapsed,
  getBoxingCountdownRemaining,
  getBoxingRoundInfo,
  recordBoxingRoundEnd,
  startBoxingRound,
} from './boxingMatchState';

registerBoxingBehaviors();

let roundEndEmitted = false;

export const boxingMode: GameMode = {
  id: 'boxing',
  defaultConfig: boxingDefaultConfig,

  setupMatch(world: World, config: GameModeConfig, services: ModeServices): void {
    roundEndEmitted = false;
    resetBoxingBehaviorState();
    startBoxingRound();

    services.getCountdownRemaining = () => getBoxingCountdownRemaining();
    services.getRoundInfo = () => getBoxingRoundInfo();
    services.getScore = () => getBoxingRoundInfo().score;
    services.getTimeRemaining = () => {
      const limit = config.rules.timeLimit ?? 90;
      const elapsedFight = getBoxingFightElapsed();
      return Math.max(0, limit - elapsedFight);
    };

    const boxing = config.boxing;
    const ringWidth = boxing?.ringWidth ?? 20;
    const half = ringWidth / 2;
    world.createEntity([
      { kind: 'transform', position: { x: 0, y: -1.5 }, rotation: 0, scale: { x: 1, y: 1 } },
      { kind: 'sprite', spriteId: 'ring', layer: 'background' },
      { kind: 'collider', shape: 'rect', width: ringWidth, height: 1, isTrigger: true, mask: 0 },
    ]);
    spawnFromPrefab(world, boxing?.playerPrefabId ?? 'boxer_player', { x: -half + 2, y: 0 });
    spawnFromPrefab(world, boxing?.opponentPrefabId ?? 'boxer_ai', { x: half - 2, y: 0 });
  },

  update(world, _time, ctx) {
    const boxing = ctx.config?.boxing;
    const ringHalf = boxing ? boxing.ringWidth / 2 : 10;
    const margin = 1.2;
    const ids = world.query({ all: ['transform'] });
    for (const id of ids) {
      const t = world.getComponent(id, 'transform');
      if (!t) continue;
      t.position.x = Math.max(-ringHalf + margin, Math.min(ringHalf - margin, t.position.x));
    }

    const timeLimit = ctx.config?.rules?.timeLimit ?? 90;
    const fightElapsed = getBoxingFightElapsed();
    if (!roundEndEmitted && fightElapsed >= timeLimit) {
      const playerIds = world.query({ tag: 'player' });
      const opponentIds = world.query({ tag: 'opponent' });
      const playerId = playerIds[0];
      const opponentId = opponentIds[0];
      const pH = playerId != null ? world.getComponent(playerId, 'health')?.current ?? 0 : 0;
      const oH = opponentId != null ? world.getComponent(opponentId, 'health')?.current ?? 0 : 0;
      let winner: 'player' | 'opponent' | 'draw' = 'draw';
      if (pH > oH) winner = 'player';
      else if (oH > pH) winner = 'opponent';

      const result = recordBoxingRoundEnd(winner, 'time');
      if (result) {
        roundEndEmitted = true;
        ctx.events.emit({
          type: 'round_ended',
          winner: result.winner,
          round: result.round,
          score: result.score,
          isMatchOver: result.isMatchOver,
          targetWins: result.targetWins,
          reason: result.reason,
        });
      }
    }
  },

  teardownMatch(world: World) {
    world.clear();
  },
};
