import type { GameMode } from '../../core2d/Engine2D';
import type { World } from '../../core2d/World';
import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { ModeServices } from '../../core2d/Engine2D';
import { boxingDefaultConfig } from './boxingConfig';
import { spawnFromPrefab } from './boxingPrefabs';
import { registerBoxingBehaviors } from './boxingBehaviors';

registerBoxingBehaviors();

export const boxingMode: GameMode = {
  id: 'boxing',
  defaultConfig: boxingDefaultConfig,

  setupMatch(world: World, config: GameModeConfig, _services: ModeServices): void {
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
  },

  teardownMatch(world: World) {
    world.clear();
  },
};
