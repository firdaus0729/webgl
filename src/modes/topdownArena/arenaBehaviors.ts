import type { EntityId } from '../../core2d/Types';
import type { BehaviorContext } from '../../core2d/Systems/ScriptSystem';
import { registerBehavior } from '../../core2d/Systems/ScriptSystem';
import { spawnArenaPrefab } from './arenaPrefabs';

const playerLastShot = new Map<EntityId, number>();

function getPlayerId(world: BehaviorContext['world']): EntityId | null {
  const ids = world.query({ tag: 'player' });
  return ids[0] ?? null;
}

export function registerArenaBehaviors(): void {
  registerBehavior('player_arena_shooter', (entity, ctx) => {
    const { world, input, time } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;

    const cfg = ctx.config?.topdownArena;
    const speed = cfg?.playerSpeed ?? 8;
    let vx = 0;
    let vy = 0;
    if (input.isActionDown('move_left')) vx -= speed;
    if (input.isActionDown('move_right')) vx += speed;
    if (input.isActionDown('move_up')) vy += speed;
    if (input.isActionDown('move_down')) vy -= speed;
    velocity.vel.x = vx;
    velocity.vel.y = vy;

    const lastShot = playerLastShot.get(entity) ?? 0;
    const fireInterval = cfg?.fireInterval ?? 0.3;
    if (input.isActionDown('attack_primary') && time.elapsed - lastShot >= fireInterval) {
      playerLastShot.set(entity, time.elapsed);
      const bulletSpeed = cfg?.bulletSpeed ?? 18;
      let dx = 1;
      let dy = 0;
      if (vx !== 0 || vy !== 0) {
        dx = vx;
        dy = vy;
      }
      const len = Math.hypot(dx, dy) || 1;
      spawnArenaPrefab(world, 'bullet', {
        position: { x: transform.position.x + (dx / len) * 0.6, y: transform.position.y + (dy / len) * 0.6 },
        vel: { x: (dx / len) * bulletSpeed, y: (dy / len) * bulletSpeed },
      });
    }
  });

  registerBehavior('enemy_chaser', (entity, ctx) => {
    const { world } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;

    const playerId = getPlayerId(world);
    if (playerId == null) {
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }
    const playerT = world.getComponent(playerId, 'transform');
    if (!playerT) return;

    const dx = playerT.position.x - transform.position.x;
    const dy = playerT.position.y - transform.position.y;
    const len = Math.hypot(dx, dy) || 1;
    const cfg = ctx.config?.topdownArena;
    const speed = cfg?.enemySpeed ?? 3.5;
    velocity.vel.x = (dx / len) * speed;
    velocity.vel.y = (dy / len) * speed;
  });
}
