import type { GameMode } from '../../core2d/Engine2D';
import type { World } from '../../core2d/World';
import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { ModeServices } from '../../core2d/Engine2D';
import { runnerDefaultConfig } from './runnerConfig';
import { spawnRunnerPrefab, RUNNER_LANE_Y } from './runnerPrefabs';
import { registerRunnerBehaviors, resetRunnerPlayerLane } from './runnerBehaviors';

registerRunnerBehaviors();

let lastSpawnTime = 0;
const SPAWN_X = 14;
const HIT_MARGIN = 0.8;

export const runnerMode: GameMode = {
  id: 'endless_runner',
  defaultConfig: runnerDefaultConfig,

  setupMatch(world: World, _config: GameModeConfig, _services: ModeServices): void {
    lastSpawnTime = 0;
    resetRunnerPlayerLane();
    spawnRunnerPrefab(world, 'runner_player', { x: 0, y: RUNNER_LANE_Y[1] });
  },

  update(world, time, ctx) {
    const cfg = ctx.config.endlessRunner;
    const speed = cfg?.baseSpeed ?? 8;
    const interval = cfg?.spawnInterval ?? 1.2;

    if (time.elapsed - lastSpawnTime >= interval) {
      const lane = Math.floor(Math.random() * RUNNER_LANE_Y.length);
      const id = spawnRunnerPrefab(world, 'obstacle', { x: SPAWN_X, y: RUNNER_LANE_Y[lane] });
      const v = world.getComponent(id, 'velocity');
      if (v) v.vel.x = -speed;
      lastSpawnTime = time.elapsed;
    }

    const obstacles = world.query({ tag: 'obstacle' });
    for (const id of obstacles) {
      const t = world.getComponent(id, 'transform');
      const v = world.getComponent(id, 'velocity');
      if (t && v) {
        t.position.x += v.vel.x * time.dt;
        if (t.position.x < -5) world.destroyEntity(id);
      }
    }

    const players = world.query({ tag: 'player' });
    const playerId = players[0];
    if (playerId == null) return;
    const pt = world.getComponent(playerId, 'transform');
    if (!pt) return;

    for (const id of obstacles) {
      const ot = world.getComponent(id, 'transform');
      if (!ot) continue;
      const dx = Math.abs(ot.position.x - pt.position.x);
      const dy = Math.abs(ot.position.y - pt.position.y);
      if (dx < HIT_MARGIN && dy < HIT_MARGIN) {
        ctx.events.emit({ type: 'entity_died', entity: playerId });
        return;
      }
    }
  },

  teardownMatch(world: World): void {
    world.clear();
  },
};
