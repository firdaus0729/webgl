import type { World } from '../World';
import type { Time } from '../Types';
import type { EventBus } from '../Events';
import type { InputManager } from '../Input';
import type { EntityId } from '../Types';

export interface BehaviorContext {
  world: World;
  time: Time;
  input: InputManager;
  events: EventBus;
}

export type BehaviorFn = (entity: EntityId, ctx: BehaviorContext) => void;

const registry = new Map<string, BehaviorFn>();

export function registerBehavior(id: string, fn: BehaviorFn): void {
  registry.set(id, fn);
}

export function getBehavior(id: string): BehaviorFn | undefined {
  return registry.get(id);
}

export function scriptSystem(
  world: World,
  _time: Time,
  ctx: BehaviorContext
): void {
  const ids = world.query({ all: ['script'] });
  for (const id of ids) {
    const script = world.getComponent(id, 'script');
    if (!script) continue;
    const fn = registry.get(script.behaviorId);
    if (fn) fn(id, ctx);
  }
}
