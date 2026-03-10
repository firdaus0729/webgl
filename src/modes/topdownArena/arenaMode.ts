import type { GameMode } from '../../core2d/Engine2D';
import type { World } from '../../core2d/World';
import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { ModeServices } from '../../core2d/Engine2D';
import { arenaDefaultConfig } from './arenaConfig';
import { spawnArenaPrefab } from './arenaPrefabs';
import { registerArenaBehaviors } from './arenaBehaviors';

registerArenaBehaviors();

let score = 0;
let lastSpawnTime = 0;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

const BULLET_HIT_RADIUS = 0.6;

export const arenaMode: GameMode = {
  id: 'topdown_arena',
  defaultConfig: arenaDefaultConfig,

  setupMatch(world: World, _config: GameModeConfig, services: ModeServices): void {
    score = 0;
    lastSpawnTime = 0;
    services.getScore = () => ({ player: score, opponent: 0 });
    spawnArenaPrefab(world, 'player', { position: { x: 0, y: 0 } });
  },

  update(world, time, ctx) {
    const config = ctx.config?.topdownArena;
    const arenaRadius = config?.arenaRadius ?? 14;
    const spawnInterval = config?.spawnInterval ?? 2.5;
    const enemyHealth = config?.enemyHealth ?? 2;
    const scorePerKill = config?.scorePerKill ?? 100;
    const now = time.elapsed;

    const playerIds = world.query({ tag: 'player' });
    const playerId = playerIds[0];
    if (playerId != null) {
      const t = world.getComponent(playerId, 'transform');
      if (t) {
        const r = Math.hypot(t.position.x, t.position.y);
        if (r > arenaRadius) {
          t.position.x *= arenaRadius / r;
          t.position.y *= arenaRadius / r;
        }
      }
    }

    if (now - lastSpawnTime >= spawnInterval) {
      const angle = Math.random() * Math.PI * 2;
      const r = arenaRadius * (0.6 + Math.random() * 0.35);
      const ex = Math.cos(angle) * r;
      const ey = Math.sin(angle) * r;
      const eid = spawnArenaPrefab(world, 'enemy', { position: { x: ex, y: ey } });
      const health = world.getComponent(eid, 'health');
      if (health) {
        health.max = enemyHealth;
        health.current = enemyHealth;
      }
      lastSpawnTime = now;
    }

    const bulletIds = world.query({ tag: 'bullet' });
    const enemyIds = world.query({ tag: 'enemy' });
    const playerT = playerId != null ? world.getComponent(playerId, 'transform') : null;

    for (const bid of bulletIds) {
      const bT = world.getComponent(bid, 'transform');
      if (!bT) continue;
      if (Math.abs(bT.position.x) > arenaRadius + 2 || Math.abs(bT.position.y) > arenaRadius + 2) {
        world.destroyEntity(bid);
        continue;
      }
      for (const eid of enemyIds) {
        const eT = world.getComponent(eid, 'transform');
        if (!eT) continue;
        if (dist(bT.position, eT.position) < BULLET_HIT_RADIUS) {
          const health = world.getComponent(eid, 'health');
          if (health) {
            health.current = Math.max(0, health.current - 1);
            if (health.current <= 0) {
              score += scorePerKill;
              world.destroyEntity(eid);
            }
          }
          world.destroyEntity(bid);
          break;
        }
      }
    }

    if (playerT) {
      for (const eid of world.query({ tag: 'enemy' })) {
        const eT = world.getComponent(eid, 'transform');
        if (!eT) continue;
        if (dist(playerT.position, eT.position) < 1.2) {
          const health = world.getComponent(playerId!, 'health');
          if (health) {
            health.current = Math.max(0, health.current - 10);
            if (health.current <= 0) {
              ctx.events.emit({ type: 'entity_died', entity: playerId! });
            }
          }
          break;
        }
      }
    }

    for (const eid of world.query({ tag: 'enemy' })) {
      const t = world.getComponent(eid, 'transform');
      if (t && Math.hypot(t.position.x, t.position.y) > arenaRadius + 1) {
        const r = arenaRadius / Math.hypot(t.position.x, t.position.y);
        t.position.x *= r;
        t.position.y *= r;
      }
    }
  },

  teardownMatch(world: World) {
    world.clear();
  },
};
