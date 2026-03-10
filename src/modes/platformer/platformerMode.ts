import type { GameMode } from '../../core2d/Engine2D';
import type { World } from '../../core2d/World';
import type { GameModeConfig } from '../../core2d/GameModeConfig';
import type { ModeServices } from '../../core2d/Engine2D';
import { platformerDefaultConfig } from './platformerConfig';
import { spawnPlatformerPrefab } from './platformerPrefabs';
import { registerPlatformerBehaviors, resetPlatformerBehaviorState, removeEnemyFromPatrol } from './platformerBehaviors';

registerPlatformerBehaviors();

let score = 0;
let starsEarned = 0;
let enemiesKilled = 0;
let invincibleUntil = 0;

function getAABB(
  world: World,
  id: number
): { left: number; right: number; top: number; bottom: number } | null {
  const transform = world.getComponent(id, 'transform');
  const collider = world.getComponent(id, 'collider');
  if (!transform || !collider || collider.shape !== 'rect' || collider.width == null || collider.height == null) return null;
  const w = collider.width * (transform.scale?.x ?? 1);
  const h = collider.height * (transform.scale?.y ?? 1);
  const x = transform.position.x;
  const y = transform.position.y;
  return { left: x - w / 2, right: x + w / 2, top: y + h / 2, bottom: y - h / 2 };
}

function overlap(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number }
): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom > b.top || a.top < b.bottom);
}

export const platformerMode: GameMode = {
  id: 'platformer',
  defaultConfig: platformerDefaultConfig,

  setupMatch(world: World, config: GameModeConfig, services: ModeServices): void {
    resetPlatformerBehaviorState();
    score = 0;
    starsEarned = 0;
    enemiesKilled = 0;
    invincibleUntil = 0;
    services.getScore = () => ({ player: score, opponent: 0 });

    const cfg = config.platformer;
    const levelW = cfg?.levelWidth ?? 60;
    const levelH = cfg?.levelHeight ?? 16;
    const groundY = -levelH / 2 + 0.5;
    const halfW = levelW / 2;

    spawnPlatformerPrefab(world, 'platformer_player', { x: 2, y: 2 });
    for (let x = -halfW; x <= halfW; x += 4) {
      spawnPlatformerPrefab(world, 'platform', { x, y: groundY });
    }
    spawnPlatformerPrefab(world, 'platform', { x: 8, y: groundY + 2 });
    spawnPlatformerPrefab(world, 'platform', { x: 14, y: groundY + 3.5 });
    spawnPlatformerPrefab(world, 'platform', { x: 20, y: groundY + 2 });
    spawnPlatformerPrefab(world, 'moving_platform', { x: 12, y: groundY + 1.2 });
    spawnPlatformerPrefab(world, 'moving_platform', { x: 18, y: groundY + 4 });
    spawnPlatformerPrefab(world, 'bridge', { x: 6, y: groundY + 0.4 });
    spawnPlatformerPrefab(world, 'bridge', { x: 22, y: groundY + 0.4 });
    spawnPlatformerPrefab(world, 'enemy', { x: 10, y: groundY + 1.5 });
    spawnPlatformerPrefab(world, 'enemy', { x: 18, y: groundY + 4 });
    spawnPlatformerPrefab(world, 'enemy', { x: 4, y: groundY + 0.9 });
    spawnPlatformerPrefab(world, 'coin', { x: 6, y: groundY + 3 });
    spawnPlatformerPrefab(world, 'coin', { x: 12, y: groundY + 5 });
    spawnPlatformerPrefab(world, 'coin', { x: 22, y: groundY + 3.5 });
    spawnPlatformerPrefab(world, 'coin', { x: 3, y: groundY + 2.5 });
    spawnPlatformerPrefab(world, 'star', { x: 5, y: groundY + 3.5 });
    spawnPlatformerPrefab(world, 'star', { x: 16, y: groundY + 5 });
    spawnPlatformerPrefab(world, 'star', { x: 24, y: groundY + 4 });
    spawnPlatformerPrefab(world, 'goal', { x: 28, y: groundY + 1 });
  },

  update(world, time, ctx) {
    const cfg = ctx.config?.platformer;
    const levelW = (cfg?.levelWidth ?? 60) / 2;
    const levelH = (cfg?.levelHeight ?? 16) / 2;

    const playerIds = world.query({ tag: 'player' });
    const playerId = playerIds[0];
    if (playerId == null) return;

    const transform = world.getComponent(playerId, 'transform');
    const velocity = world.getComponent(playerId, 'velocity');
    const health = world.getComponent(playerId, 'health');
    if (!transform || !velocity) return;

    transform.position.x = Math.max(-levelW + 0.5, Math.min(levelW - 0.5, transform.position.x));
    transform.position.y = Math.max(-levelH + 0.5, Math.min(levelH - 0.5, transform.position.y));

    const playerBox = getAABB(world, playerId);
    if (!playerBox) return;

    const goalIds = world.query({ tag: 'goal' });
    for (const gid of goalIds) {
      const goalBox = getAABB(world, gid);
      if (goalBox && overlap(playerBox, goalBox)) {
        ctx.events.emit({
          type: 'level_complete',
          score,
          starsEarned,
          enemiesKilled,
          totalScore: score,
        });
        return;
      }
    }

    const platformIds = [...world.query({ tag: 'platform' }), ...world.query({ tag: 'platform_moving' })];
    for (const pid of platformIds) {
      const platBox = getAABB(world, pid);
      if (!platBox || !overlap(playerBox, platBox)) continue;
      const dy = playerBox.bottom - platBox.top;
      if (dy > 0 && dy < 0.5 && (velocity?.vel.y ?? 0) <= 0) {
        transform.position.y = platBox.top + (playerBox.top - playerBox.bottom) / 2 + 0.01;
        if (velocity) velocity.vel.y = 0;
      }
    }
    const playerBoxAfter = getAABB(world, playerId) ?? playerBox;

    const movingIds = world.query({ tag: 'platform_moving' });
    const dt = time.dt ?? 0.016;
    for (const mid of movingIds) {
      const movBox = getAABB(world, mid);
      if (!movBox || !overlap(playerBoxAfter, movBox)) continue;
      const playerFeet = playerBoxAfter.bottom;
      const platTop = movBox.top;
      if (playerFeet <= platTop + 0.15 && playerFeet >= platTop - 0.15) {
        const v = world.getComponent(mid, 'velocity');
        if (v) {
          transform.position.x += v.vel.x * dt;
          transform.position.y += v.vel.y * dt;
        }
      }
    }

    const coinIds = world.query({ tag: 'coin' });
    const coinPoints = cfg?.coinPoints ?? 10;
    for (const cid of coinIds) {
      const coinBox = getAABB(world, cid);
      if (coinBox && overlap(playerBoxAfter, coinBox)) {
        world.destroyEntity(cid);
        score += coinPoints;
      }
    }

    const starIds = world.query({ tag: 'star' });
    const starPoints = cfg?.starPoints ?? 50;
    for (const sid of starIds) {
      const starBox = getAABB(world, sid);
      if (starBox && overlap(playerBoxAfter, starBox)) {
        world.destroyEntity(sid);
        starsEarned += 1;
        score += starPoints;
      }
    }

    const enemyIds = world.query({ tag: 'enemy' });
    for (const eid of enemyIds) {
      const enemyBox = getAABB(world, eid);
      if (!enemyBox || !overlap(playerBoxAfter, enemyBox)) continue;
      const stomp = (velocity?.vel.y ?? 0) < 0 && playerBox.bottom > enemyBox.top - 0.2;
      if (stomp) {
        enemiesKilled += 1;
        removeEnemyFromPatrol(eid);
        world.destroyEntity(eid);
        if (velocity) velocity.vel.y = 8;
      } else if (health && time.elapsed >= invincibleUntil) {
        health.current = Math.max(0, health.current - 1);
        invincibleUntil = time.elapsed + 1.5;
        if (health.current <= 0) {
          ctx.events.emit({ type: 'entity_died', entity: playerId });
        }
      }
    }

    if (health && health.current <= 0) {
      ctx.events.emit({ type: 'entity_died', entity: playerId });
    }
  },

  teardownMatch(world: World) {
    world.clear();
  },
};
