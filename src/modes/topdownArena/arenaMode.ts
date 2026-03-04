import type { GameMode } from '../../core2d/Engine2D';
import type { World } from '../../core2d/World';
import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { ModeServices } from '../../core2d/Engine2D';
import { arenaDefaultConfig } from './arenaConfig';
import { spawnArenaPrefab } from './arenaPrefabs';
import { registerArenaBehaviors } from './arenaBehaviors';

registerArenaBehaviors();

const BULLET_HIT_RADIUS = 0.6;
let lastSpawnTime = 0;

export const arenaMode: GameMode = {
  id: 'topdown_arena',
  defaultConfig: arenaDefaultConfig,

  setupMatch(world: World, _config: GameModeConfig, _services: ModeServices): void {
    lastSpawnTime = 0;
    spawnArenaPrefab(world, 'arena_player', { x: 0, y: 0 });
  },

  update(world, time, ctx) {
    const config = ctx.config;
    const arena = config.topdownArena;
    const radius = arena?.arenaRadius ?? 12;
    const spawnInterval = arena?.spawnInterval ?? 2.5;

    const now = time.elapsed;
    if (now - lastSpawnTime >= spawnInterval) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.6 + Math.random() * 0.4);
      spawnArenaPrefab(world, 'enemy_arena', {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
      lastSpawnTime = now;
    }

    const ids = world.getAllEntities();
    const bullets: number[] = [];
    const enemies: number[] = [];
    const players: number[] = [];
    for (const id of ids) {
      const tag = world.getComponent(id, 'tag');
      if (tag?.value === 'bullet') bullets.push(id);
      else if (tag?.value === 'enemy') enemies.push(id);
      else if (tag?.value === 'player') players.push(id);
    }

    for (const bid of bullets) {
      const bt = world.getComponent(bid, 'transform');
      if (!bt) continue;
      for (const eid of enemies) {
        const et = world.getComponent(eid, 'transform');
        if (!et) continue;
        const d = Math.hypot(et.position.x - bt.position.x, et.position.y - bt.position.y);
        if (d < BULLET_HIT_RADIUS) {
          const h = world.getComponent(eid, 'health');
          if (h) {
            h.current = Math.max(0, h.current - 15);
            if (h.current <= 0) ctx.events.emit({ type: 'entity_died', entity: eid });
          }
          world.destroyEntity(bid);
          break;
        }
      }
      for (const pid of players) {
        const pt = world.getComponent(pid, 'transform');
        if (!pt) continue;
        const d = Math.hypot(pt.position.x - bt.position.x, pt.position.y - bt.position.y);
        if (d < BULLET_HIT_RADIUS) {
          const h = world.getComponent(pid, 'health');
          if (h) {
            h.current = Math.max(0, h.current - 10);
            if (h.current <= 0) ctx.events.emit({ type: 'entity_died', entity: pid });
          }
          world.destroyEntity(bid);
          break;
        }
      }
    }

    for (const id of world.query({ all: ['transform'] })) {
      const t = world.getComponent(id, 'transform');
      if (!t) continue;
      const r = Math.hypot(t.position.x, t.position.y);
      if (r > radius) {
        const scale = radius / r;
        t.position.x *= scale;
        t.position.y *= scale;
      }
    }
  },

  teardownMatch(world: World): void {
    world.clear();
  },
};
