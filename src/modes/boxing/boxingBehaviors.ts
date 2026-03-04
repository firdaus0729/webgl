import type { EntityId } from '../../core2d/Types';
import type { BehaviorContext } from '../../core2d/Systems/ScriptSystem';
import { registerBehavior } from '../../core2d/Systems/ScriptSystem';

const PUNCH_RANGE = 2.5;
const PUNCH_DAMAGE = 12;
const AI_PUNCH_COOLDOWN = 0.8;
const MOVE_SPEED = 5;

function getOpponentId(world: BehaviorContext['world'], self: EntityId): EntityId | null {
  const tag = world.getComponent(self, 'tag');
  const isPlayer = tag?.value === 'player';
  const ids = world.query({ tag: isPlayer ? 'opponent' : 'player' });
  return ids[0] ?? null;
}

function tryPunch(ctx: BehaviorContext, attacker: EntityId, victim: EntityId): boolean {
  const { world } = ctx;
  const tAtt = world.getComponent(attacker, 'transform');
  const tVict = world.getComponent(victim, 'transform');
  const health = world.getComponent(victim, 'health');
  if (!tAtt || !tVict || !health) return false;
  const dx = tVict.position.x - tAtt.position.x;
  const dist = Math.abs(dx);
  if (dist > PUNCH_RANGE) return false;
  health.current = Math.max(0, health.current - PUNCH_DAMAGE);
  if (health.current <= 0) {
    ctx.events.emit({ type: 'entity_died', entity: victim });
  }
  return true;
}

export function registerBoxingBehaviors(): void {
  registerBehavior('player_boxer_controller', (entity, ctx) => {
    const { world, input } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;

    let vx = 0;
    if (input.isActionDown('move_left')) vx -= MOVE_SPEED;
    if (input.isActionDown('move_right')) vx += MOVE_SPEED;
    velocity.vel.x = vx;
    velocity.vel.y = 0;

    const opponentId = getOpponentId(world, entity);
    if (opponentId != null && (input.justPressed('attack_primary') || input.justPressed('attack_secondary'))) {
      tryPunch(ctx, entity, opponentId);
    }
  });

  const aiCooldowns = new Map<EntityId, number>();
  registerBehavior('ai_boxer_aggressive', (entity, ctx) => {
    const { world, time } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    if (!velocity || !transform) return;

    const opponentId = getOpponentId(world, entity);
    if (opponentId == null) return;
    const oppTransform = world.getComponent(opponentId, 'transform');
    if (!oppTransform) return;

    const dx = oppTransform.position.x - transform.position.x;
    const dist = Math.abs(dx);
    const now = time.elapsed;
    const last = aiCooldowns.get(entity) ?? 0;
    if (dist <= PUNCH_RANGE && now - last >= AI_PUNCH_COOLDOWN) {
      if (tryPunch(ctx, entity, opponentId)) {
        aiCooldowns.set(entity, now);
      }
      velocity.vel.x = 0;
    } else {
      velocity.vel.x = dx > 0 ? MOVE_SPEED * 0.8 : -MOVE_SPEED * 0.8;
    }
    velocity.vel.y = 0;
  });
}
