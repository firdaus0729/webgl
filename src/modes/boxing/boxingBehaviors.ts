import type { EntityId } from '../../core2d/Types';
import type { BehaviorContext } from '../../core2d/Systems/ScriptSystem';
import { registerBehavior } from '../../core2d/Systems/ScriptSystem';
import { isBoxingFrozen, recordBoxingRoundEnd } from './boxingMatchState';

const PUNCH_RANGE = 2.5;
const MOVE_SPEED = 5;
const AI_PUNCH_COOLDOWN = 0.8;
const AI_BLOCK_CHANCE = 0.015;
const AI_BLOCK_DURATION = 0.8;
const AI_BLOCK_COOLDOWN = 2.5;

function getBoxingConfig(ctx: BehaviorContext) {
  const boxing = ctx.config?.boxing;
  return {
    jabDamage: boxing?.jabDamage ?? 8,
    strongDamage: boxing?.strongDamage ?? 18,
    jabCooldown: boxing?.jabCooldown ?? 0.25,
    strongCooldown: boxing?.strongCooldown ?? 0.6,
    blockMultiplier: boxing?.blockDamageMultiplier ?? 0.25,
  };
}

function getOpponentId(world: BehaviorContext['world'], self: EntityId): EntityId | null {
  const tag = world.getComponent(self, 'tag');
  const isPlayer = tag?.value === 'player';
  const ids = world.query({ tag: isPlayer ? 'opponent' : 'player' });
  return ids[0] ?? null;
}

export type AttackType = 'jab' | 'strong';

function tryPunch(
  ctx: BehaviorContext,
  attacker: EntityId,
  victim: EntityId,
  attackType: AttackType
): boolean {
  const { world } = ctx;
  const tAtt = world.getComponent(attacker, 'transform');
  const tVict = world.getComponent(victim, 'transform');
  const health = world.getComponent(victim, 'health');
  const blocking = world.getComponent(victim, 'blocking');
  if (!tAtt || !tVict || !health) return false;
  const dx = tVict.position.x - tAtt.position.x;
  const dist = Math.abs(dx);
  if (dist > PUNCH_RANGE) return false;

  const { jabDamage, strongDamage, blockMultiplier } = getBoxingConfig(ctx);
  let damage = attackType === 'jab' ? jabDamage : strongDamage;
  if (blocking?.active) {
    damage *= blockMultiplier;
  }
  health.current = Math.max(0, health.current - damage);
  if (health.current <= 0) {
    const victimTag = world.getComponent(victim, 'tag')?.value;
    const winner = victimTag === 'player' ? 'opponent' : 'player';
    const result = recordBoxingRoundEnd(winner, 'ko');
    if (result) {
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
  return true;
}

const playerCooldowns = new Map<EntityId, { jab: number; strong: number }>();
const aiCooldowns = new Map<EntityId, number>();
const aiBlockUntil = new Map<EntityId, number>();

/** Call when a new match starts (e.g. from boxingMode.setupMatch) so restart behaves like first start. */
export function resetBoxingBehaviorState(): void {
  playerCooldowns.clear();
  aiCooldowns.clear();
  aiBlockUntil.clear();
}

export function registerBoxingBehaviors(): void {
  registerBehavior('player_boxer_controller', (entity, ctx) => {
    const { world, input, time } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    const blockingComp = world.getComponent(entity, 'blocking');
    if (!velocity || !transform) return;

    if (isBoxingFrozen()) {
      if (blockingComp) blockingComp.active = false;
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }

    blockingComp && (blockingComp.active = input.isActionDown('block'));

    let vx = 0;
    if (!blockingComp?.active) {
      if (input.isActionDown('move_left')) vx -= MOVE_SPEED;
      if (input.isActionDown('move_right')) vx += MOVE_SPEED;
    }
    velocity.vel.x = vx;
    velocity.vel.y = 0;

    const { jabCooldown, strongCooldown } = getBoxingConfig(ctx);
    const cooldowns = playerCooldowns.get(entity) ?? { jab: 0, strong: 0 };
    const now = time.elapsed;

    const canJab = now >= cooldowns.jab;
    const canStrong = now >= cooldowns.strong;

    const opponentId = getOpponentId(world, entity);
    if (opponentId != null) {
      if (input.justPressed('attack_primary') && canJab) {
        if (tryPunch(ctx, entity, opponentId, 'jab')) {
          cooldowns.jab = now + jabCooldown;
          playerCooldowns.set(entity, cooldowns);
        }
      } else if (input.justPressed('attack_secondary') && canStrong) {
        if (tryPunch(ctx, entity, opponentId, 'strong')) {
          cooldowns.strong = now + strongCooldown;
          playerCooldowns.set(entity, cooldowns);
        }
      }
    }
  });

  registerBehavior('ai_boxer_aggressive', (entity, ctx) => {
    const { world, time } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    const blockingComp = world.getComponent(entity, 'blocking');
    if (!velocity || !transform) return;

    if (isBoxingFrozen()) {
      if (blockingComp) blockingComp.active = false;
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }

    const now = time.elapsed;
    const blockUntil = aiBlockUntil.get(entity) ?? 0;
    const isBlocking = now < blockUntil;
    if (blockingComp) blockingComp.active = isBlocking;

    const opponentId = getOpponentId(world, entity);
    if (opponentId == null) {
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }
    const oppTransform = world.getComponent(opponentId, 'transform');
    if (!oppTransform) return;

    const dx = oppTransform.position.x - transform.position.x;
    const dist = Math.abs(dx);
    const lastPunch = aiCooldowns.get(entity) ?? 0;

    if (isBlocking) {
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }

    if (dist <= PUNCH_RANGE && now - lastPunch >= AI_PUNCH_COOLDOWN) {
      const didPunch = tryPunch(ctx, entity, opponentId, Math.random() < 0.5 ? 'jab' : 'strong');
      if (didPunch) aiCooldowns.set(entity, now);
      velocity.vel.x = 0;
    } else {
      if (now >= blockUntil + AI_BLOCK_COOLDOWN && Math.random() < AI_BLOCK_CHANCE) {
        aiBlockUntil.set(entity, now + AI_BLOCK_DURATION);
      }
      velocity.vel.x = dx > 0 ? MOVE_SPEED * 0.8 : -MOVE_SPEED * 0.8;
    }
    velocity.vel.y = 0;
  });
}
