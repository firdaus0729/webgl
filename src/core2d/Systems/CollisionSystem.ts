import type { World } from '../World';
import type { EventBus } from '../Events';

function getAABB(world: World, id: number): { left: number; right: number; top: number; bottom: number } | null {
  const transform = world.getComponent(id, 'transform');
  const collider = world.getComponent(id, 'collider');
  if (!transform || !collider) return null;
  const x = transform.position.x;
  const y = transform.position.y;
  if (collider.shape === 'rect' && collider.width != null && collider.height != null) {
    const w = collider.width * (transform.scale?.x ?? 1);
    const h = collider.height * (transform.scale?.y ?? 1);
    return {
      left: x - w / 2,
      right: x + w / 2,
      top: y + h / 2,
      bottom: y - h / 2,
    };
  }
  if (collider.shape === 'circle' && collider.radius != null) {
    const r = collider.radius;
    return { left: x - r, right: x + r, top: y + r, bottom: y - r };
  }
  return null;
}

function overlap(a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom > b.top || a.top < b.bottom);
}

export function collisionSystem(world: World, events: EventBus): void {
  const ids = world.query({ all: ['transform', 'collider'] });
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const boxA = getAABB(world, a);
      const boxB = getAABB(world, b);
      if (!boxA || !boxB) continue;
      if (!overlap(boxA, boxB)) continue;
      const collA = world.getComponent(a, 'collider');
      const collB = world.getComponent(b, 'collider');
      if (!collA || !collB) continue;
      if (collA.isTrigger || collB.isTrigger) {
        events.emit({ type: 'trigger_enter', a, b });
      } else {
        events.emit({ type: 'collision', a, b });
      }
    }
  }
}
