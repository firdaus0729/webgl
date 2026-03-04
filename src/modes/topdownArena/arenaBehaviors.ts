import type { EntityId } from '../../core2d/Types';
import { registerBehavior } from '../../core2d/Systems/ScriptSystem';
import { spawnArenaPrefab } from './arenaPrefabs';

const BULLET_COOLDOWN = 0.2;

const playerCooldowns = new Map<EntityId, number>();

export function registerArenaBehaviors(): void {
  registerBehavior('player_arena_shooter', (entity, ctx) => {
    const { world, input, time } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;

    let vx = 0, vy = 0;
    if (input.isActionDown('move_left')) vx -= 1;
    if (input.isActionDown('move_right')) vx += 1;
    if (input.isActionDown('move_up')) vy += 1;
    if (input.isActionDown('move_down')) vy -= 1;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      const speed = 8;
      velocity.vel.x = (vx / len) * speed;
      velocity.vel.y = (vy / len) * speed;
      transform.rotation = Math.atan2(vx, -vy);
    } else {
      velocity.vel.x = 0;
      velocity.vel.y = 0;
    }

    const last = playerCooldowns.get(entity) ?? 0;
    if (input.isActionDown('attack_primary') && time.elapsed - last >= BULLET_COOLDOWN) {
      const bulletSpeed = 18;
      const dx = Math.sin(transform.rotation);
      const dy = -Math.cos(transform.rotation);
      spawnArenaPrefab(world as { createEntity: (c: import('../../core2d/Components').Component[]) => number }, 'bullet', {
        x: transform.position.x + dx * 0.6,
        y: transform.position.y + dy * 0.6,
      }, { vel: { x: dx * bulletSpeed, y: dy * bulletSpeed } });
      playerCooldowns.set(entity, time.elapsed);
    }
  });

  registerBehavior('enemy_chaser', (entity, ctx) => {
    const { world } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;
    const players = world.query({ tag: 'player' });
    const targetId = players[0];
    if (targetId == null) return;
    const target = world.getComponent(targetId, 'transform');
    if (!target) return;
    const dx = target.position.x - transform.position.x;
    const dy = target.position.y - transform.position.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return;
    const speed = 4;
    velocity.vel.x = (dx / len) * speed;
    velocity.vel.y = (dy / len) * speed;
  });
}
