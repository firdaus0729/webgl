import type { EntityId } from '../../core2d/Types';
import type { BehaviorContext } from '../../core2d/Systems/ScriptSystem';
import { registerBehavior } from '../../core2d/Systems/ScriptSystem';

const GROUNDED_MARGIN = 0.12;
const ENEMY_PATROL_SPEED = 2.5;

function getBox(
  world: BehaviorContext['world'],
  id: EntityId
): { left: number; right: number; top: number; bottom: number } | null {
  const transform = world.getComponent(id, 'transform');
  const collider = world.getComponent(id, 'collider');
  if (!transform || !collider || collider.shape !== 'rect' || collider.width == null || collider.height == null) return null;
  const w = collider.width * (transform.scale?.x ?? 1);
  const h = collider.height * (transform.scale?.y ?? 1);
  const x = transform.position.x;
  const y = transform.position.y;
  return {
    left: x - w / 2,
    right: x + w / 2,
    top: y + h / 2,
    bottom: y - h / 2,
  };
}

function isGrounded(world: BehaviorContext['world'], playerId: EntityId): boolean {
  const playerBox = getBox(world, playerId);
  if (!playerBox) return false;
  const platformIds = [...world.query({ tag: 'platform' }), ...world.query({ tag: 'platform_moving' })];
  for (const pid of platformIds) {
    const platformBox = getBox(world, pid);
    if (!platformBox) continue;
    const xOverlap = playerBox.right > platformBox.left && playerBox.left < platformBox.right;
    const playerFeet = playerBox.bottom;
    const platformTop = platformBox.top;
    if (xOverlap && playerFeet <= platformTop + GROUNDED_MARGIN && playerFeet >= platformTop - GROUNDED_MARGIN) {
      return true;
    }
  }
  return false;
}

const enemyPatrol = new Map<EntityId, { left: number; right: number; dir: number }>();

const movingPlatformState = new Map<
  EntityId,
  { axis: 'x' | 'y'; min: number; max: number; speed: number; dir: number }
>();

export function registerPlatformerBehaviors(): void {
  registerBehavior('player_platformer', (entity, ctx) => {
    const { world, input } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;

    const cfg = ctx.config?.platformer;
    const moveSpeed = cfg?.moveSpeed ?? 7;
    const jumpForce = cfg?.jumpForce ?? 12;

    let vx = 0;
    if (input.isActionDown('move_left')) vx -= moveSpeed;
    if (input.isActionDown('move_right')) vx += moveSpeed;
    velocity.vel.x = vx;

    if (input.justPressed('jump') && isGrounded(world, entity)) {
      velocity.vel.y = jumpForce;
    }
  });

  registerBehavior('enemy_platformer', (entity, ctx) => {
    const { world } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;

    if (!enemyPatrol.has(entity)) {
      const x = transform.position.x;
      enemyPatrol.set(entity, { left: x - 3, right: x + 3, dir: 1 });
    }
    const patrol = enemyPatrol.get(entity)!;
    if (transform.position.x >= patrol.right) patrol.dir = -1;
    if (transform.position.x <= patrol.left) patrol.dir = 1;
    velocity.vel.x = patrol.dir * ENEMY_PATROL_SPEED;
  });

  registerBehavior('moving_platform', (entity, ctx) => {
    const { world } = ctx;
    const transform = world.getComponent(entity, 'transform');
    const velocity = world.getComponent(entity, 'velocity');
    if (!transform || !velocity) return;

    const MOVE_RANGE = 2.5;
    const SPEED = 1.8;
    if (!movingPlatformState.has(entity)) {
      movingPlatformState.set(entity, {
        axis: 'x',
        min: transform.position.x - MOVE_RANGE,
        max: transform.position.x + MOVE_RANGE,
        speed: SPEED,
        dir: 1,
      });
    }
    const state = movingPlatformState.get(entity)!;
    const pos = transform.position[state.axis];
    if (pos >= state.max) state.dir = -1;
    if (pos <= state.min) state.dir = 1;
    velocity.vel.x = state.axis === 'x' ? state.dir * state.speed : 0;
    velocity.vel.y = state.axis === 'y' ? state.dir * state.speed : 0;
  });
}

export function resetPlatformerBehaviorState(): void {
  enemyPatrol.clear();
  movingPlatformState.clear();
}

export function removeEnemyFromPatrol(id: EntityId): void {
  enemyPatrol.delete(id);
}
