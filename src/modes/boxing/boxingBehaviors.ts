import type { EntityId } from '../../core2d/Types';
import type { BehaviorContext } from '../../core2d/Systems/ScriptSystem';
import { registerBehavior } from '../../core2d/Systems/ScriptSystem';
import { isBoxingFrozen, recordBoxingRoundEnd } from './boxingMatchState';

const PUNCH_RANGE = 2.5;
const MOVE_SPEED = 5;
const STEP_SPEED = 4;
const FORWARD_RATE = 1.8;
const FORWARD_DECAY = 1.2;
const FORWARD_PUNCH_BONUS = 0.2;
const AI_PUNCH_COOLDOWN = 0.8;
const AI_BLOCK_CHANCE = 0.015;
const AI_BLOCK_DURATION = 0.8;
const AI_BLOCK_COOLDOWN = 2.5;
const MIN_STAMINA_FACTOR = 0.2;

function getBoxingConfig(ctx: BehaviorContext) {
  const boxing = ctx.config?.boxing;
  return {
    jabDamage: boxing?.jabDamage ?? 8,
    strongDamage: boxing?.strongDamage ?? 18,
    jabCooldown: boxing?.jabCooldown ?? 0.25,
    strongCooldown: boxing?.strongCooldown ?? 0.6,
    blockMultiplier: boxing?.blockDamageMultiplier ?? 0.3,
    staminaMax: boxing?.staminaMax ?? 100,
    staminaRegen: boxing?.staminaRegen ?? 8,
    jabStaminaCost: boxing?.jabStaminaCost ?? 5,
    strongStaminaCost: boxing?.strongStaminaCost ?? 18,
    blockStaminaDrainAfterSec: boxing?.blockStaminaDrainAfterSec ?? 3,
    blockStaminaDrainPerSec: boxing?.blockStaminaDrainPerSec ?? 12,
  };
}

function getStaminaFactor(world: BehaviorContext['world'], entity: EntityId): number {
  const stamina = world.getComponent(entity, 'stamina');
  if (!stamina || stamina.max <= 0) return 1;
  const t = stamina.current / stamina.max;
  return Math.max(MIN_STAMINA_FACTOR, Math.min(1, t));
}

function getOpponentId(world: BehaviorContext['world'], self: EntityId): EntityId | null {
  const tag = world.getComponent(self, 'tag');
  const isPlayer = tag?.value === 'player';
  const ids = world.query({ tag: isPlayer ? 'opponent' : 'player' });
  return ids[0] ?? null;
}

const forwardAmount = new Map<EntityId, number>();
const blockStartTime = new Map<EntityId, number>();

function getForward(entity: EntityId): number {
  return forwardAmount.get(entity) ?? 0.5;
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
  const staminaAtt = world.getComponent(attacker, 'stamina');
  if (!tAtt || !tVict || !health) return false;
  const dx = tVict.position.x - tAtt.position.x;
  const dy = tVict.position.y - tAtt.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > PUNCH_RANGE) return false;

  const cfg = getBoxingConfig(ctx);
  const cost = attackType === 'jab' ? cfg.jabStaminaCost : cfg.strongStaminaCost;
  if (staminaAtt && staminaAtt.current < cost) return false;

  if (staminaAtt) {
    staminaAtt.current = Math.max(0, staminaAtt.current - cost);
  }

  let damage = attackType === 'jab' ? cfg.jabDamage : cfg.strongDamage;
  damage *= getStaminaFactor(world, attacker);
  damage *= 1 + FORWARD_PUNCH_BONUS * getForward(attacker);
  if (blocking?.active) {
    damage *= cfg.blockMultiplier;
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
  forwardAmount.clear();
  blockStartTime.clear();
}

export function registerBoxingBehaviors(): void {
  registerBehavior('player_boxer_controller', (entity, ctx) => {
    const { world, input, time } = ctx;
    const velocity = world.getComponent(entity, 'velocity');
    const transform = world.getComponent(entity, 'transform');
    const blockingComp = world.getComponent(entity, 'blocking');
    const staminaComp = world.getComponent(entity, 'stamina');
    if (!velocity || !transform) return;

    if (isBoxingFrozen()) {
      if (blockingComp) blockingComp.active = false;
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }

    const cfg = getBoxingConfig(ctx);
    const now = time.elapsed;
    const dt = time.dt;
    const staminaFactor = getStaminaFactor(world, entity);

    const wasBlocking = blockingComp?.active ?? false;
    blockingComp && (blockingComp.active = input.isActionDown('block'));
    const isBlocking = blockingComp?.active ?? false;

    if (isBlocking) {
      if (!wasBlocking) blockStartTime.set(entity, now);
      const started = blockStartTime.get(entity) ?? now;
      if (staminaComp && now - started >= cfg.blockStaminaDrainAfterSec) {
        const drain = cfg.blockStaminaDrainPerSec * dt;
        staminaComp.current = Math.max(0, staminaComp.current - drain);
      }
    } else {
      blockStartTime.delete(entity);
      if (staminaComp && staminaComp.current < staminaComp.max) {
        staminaComp.current = Math.min(staminaComp.max, staminaComp.current + cfg.staminaRegen * dt);
      }
    }

    let forward = getForward(entity);
    const opponentId = getOpponentId(world, entity);
    if (opponentId != null && !isBlocking) {
      if (input.isActionDown('move_forward')) forward = Math.min(1, forward + FORWARD_RATE * dt);
      else if (input.isActionDown('move_back')) forward = Math.max(0, forward - FORWARD_RATE * dt);
      else forward += (0.5 - forward) * FORWARD_DECAY * dt;
      forward = Math.max(0, Math.min(1, forward));
      forwardAmount.set(entity, forward);
    }

    let vx = 0;
    let vy = 0;
    if (!isBlocking) {
      if (input.isActionDown('move_left')) vx -= MOVE_SPEED;
      if (input.isActionDown('move_right')) vx += MOVE_SPEED;
      if (input.isActionDown('move_forward')) vy += STEP_SPEED;
      if (input.isActionDown('move_back')) vy -= STEP_SPEED;
      vx *= staminaFactor;
      vy *= staminaFactor;
    }
    velocity.vel.x = vx;
    velocity.vel.y = vy;

    const cooldowns = playerCooldowns.get(entity) ?? { jab: 0, strong: 0 };
    const lowStaminaMultiplier = Math.max(1, 2 - staminaFactor);
    const effectiveJabCd = cfg.jabCooldown * lowStaminaMultiplier;
    const effectiveStrongCd = cfg.strongCooldown * lowStaminaMultiplier;
    const canJab = now >= cooldowns.jab;
    const canStrong = now >= cooldowns.strong;

    if (opponentId != null) {
      const costJab = cfg.jabStaminaCost;
      const costStrong = cfg.strongStaminaCost;
      const hasStaminaJab = !staminaComp || staminaComp.current >= costJab;
      const hasStaminaStrong = !staminaComp || staminaComp.current >= costStrong;
      if (input.justPressed('attack_primary') && canJab && hasStaminaJab) {
        if (tryPunch(ctx, entity, opponentId, 'jab')) {
          cooldowns.jab = now + effectiveJabCd;
          playerCooldowns.set(entity, cooldowns);
        }
      } else if (input.justPressed('attack_secondary') && canStrong && hasStaminaStrong) {
        if (tryPunch(ctx, entity, opponentId, 'strong')) {
          cooldowns.strong = now + effectiveStrongCd;
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
    const staminaComp = world.getComponent(entity, 'stamina');
    if (!velocity || !transform) return;

    if (isBoxingFrozen()) {
      if (blockingComp) blockingComp.active = false;
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }

    const cfg = getBoxingConfig(ctx);
    const now = time.elapsed;
    const dt = time.dt;
    const staminaFactor = getStaminaFactor(world, entity);

    const blockUntil = aiBlockUntil.get(entity) ?? 0;
    const isBlocking = now < blockUntil;
    if (blockingComp) blockingComp.active = isBlocking;

    if (isBlocking) {
      const started = blockStartTime.get(entity) ?? now;
      if (staminaComp && now - started >= cfg.blockStaminaDrainAfterSec) {
        const drain = cfg.blockStaminaDrainPerSec * dt;
        staminaComp.current = Math.max(0, staminaComp.current - drain);
      }
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }
    blockStartTime.delete(entity);
    if (staminaComp && staminaComp.current < staminaComp.max) {
      staminaComp.current = Math.min(staminaComp.max, staminaComp.current + cfg.staminaRegen * dt);
    }

    const opponentId = getOpponentId(world, entity);
    if (opponentId == null) {
      velocity.vel.x = 0;
      velocity.vel.y = 0;
      return;
    }
    const oppTransform = world.getComponent(opponentId, 'transform');
    if (!oppTransform) return;

    const dx = oppTransform.position.x - transform.position.x;
    const dy = oppTransform.position.y - transform.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const lastPunch = aiCooldowns.get(entity) ?? 0;
    const costJab = cfg.jabStaminaCost;
    const costStrong = cfg.strongStaminaCost;
    const hasStamina = !staminaComp || staminaComp.current >= Math.min(costJab, costStrong);
    const aiSpeed = MOVE_SPEED * 0.8 * staminaFactor;

    if (dist <= PUNCH_RANGE && now - lastPunch >= AI_PUNCH_COOLDOWN && hasStamina) {
      const attackType: AttackType = staminaComp && staminaComp.current < costStrong ? 'jab' : Math.random() < 0.5 ? 'jab' : 'strong';
      const cost = attackType === 'jab' ? costJab : costStrong;
      if (staminaComp && staminaComp.current < cost) {
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;
        velocity.vel.x = nx * aiSpeed;
        velocity.vel.y = ny * aiSpeed;
      } else {
        const didPunch = tryPunch(ctx, entity, opponentId, attackType);
        if (didPunch) aiCooldowns.set(entity, now);
        velocity.vel.x = 0;
        velocity.vel.y = 0;
      }
    } else {
      if (now >= blockUntil + AI_BLOCK_COOLDOWN && Math.random() < AI_BLOCK_CHANCE) {
        aiBlockUntil.set(entity, now + AI_BLOCK_DURATION);
        blockStartTime.set(entity, now);
      }
      const nx = dist > 0 ? dx / dist : 0;
      const ny = dist > 0 ? dy / dist : 0;
      velocity.vel.x = nx * aiSpeed;
      velocity.vel.y = ny * aiSpeed;
    }
  });
}
