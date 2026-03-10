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
    services.getPlayerStamina = () => {
      const ids = world.query({ tag: 'player' });
      const id = ids[0];
      if (id == null) return { current: 100, max: 100 };
      const s = world.getComponent(id, 'stamina');
      return s ? { current: s.current, max: s.max } : { current: 100, max: 100 };
    };
    services.getOpponentStamina = () => {
      const ids = world.query({ tag: 'opponent' });
      const id = ids[0];
      if (id == null) return { current: 100, max: 100 };
      const s = world.getComponent(id, 'stamina');
      return s ? { current: s.current, max: s.max } : { current: 100, max: 100 };
    };

    const boxing = config.boxing;
    const ringWidth = boxing?.ringWidth ?? 20;
    const ringDepth = boxing?.ringDepth ?? 10;
    const halfW = ringWidth / 2;
    world.createEntity([
      { kind: 'transform', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
      { kind: 'sprite', spriteId: 'ring', layer: 'background' },
      { kind: 'collider', shape: 'rect', width: ringWidth, height: ringDepth, isTrigger: true, mask: 0 },
      { kind: 'tag', value: 'ring' },
    ]);
    spawnFromPrefab(world, boxing?.playerPrefabId ?? 'boxer_player', { x: -halfW + 2, y: 0 });
    spawnFromPrefab(world, boxing?.opponentPrefabId ?? 'boxer_ai', { x: halfW - 2, y: 0 });
  },

  update(world, _time, ctx) {
    const boxing = ctx.config?.boxing;
    const ringWidth = boxing?.ringWidth ?? 20;
    const ringDepth = boxing?.ringDepth ?? 10;
    const halfW = ringWidth / 2;
    const halfD = ringDepth / 2;
    const inset = 0.5;
    const minX = -halfW + inset;
    const maxX = halfW - inset;
    const minY = -halfD + inset;
    const maxY = halfD - inset;
    const ids = world.query({ all: ['transform'] });
    const tagComp = (id: number) => world.getComponent(id, 'tag')?.value;
    for (const id of ids) {
      if (tagComp(id) === 'ring') continue;
      const t = world.getComponent(id, 'transform');
      if (!t) continue;
      t.position.x = Math.max(minX, Math.min(maxX, t.position.x));
      t.position.y = Math.max(minY, Math.min(maxY, t.position.y));
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
