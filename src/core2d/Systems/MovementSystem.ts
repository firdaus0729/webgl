import type { Vec2 } from '../Types';
import type { World } from '../World';
import type { Time } from '../Types';

export function movementSystem(
  world: World,
  time: Time,
  gravity: Vec2,
  maxSpeed: number
): void {
  const ids = world.query({ all: ['transform', 'velocity'] });
  for (const id of ids) {
    const transform = world.getComponent(id, 'transform');
    const velocity = world.getComponent(id, 'velocity');
    const body = world.getComponent(id, 'body');
    if (!transform || !velocity) continue;

    let vx = velocity.vel.x;
    let vy = velocity.vel.y;
    if (body?.gravity) {
      vx += gravity.x * time.dt;
      vy += gravity.y * time.dt;
    }
    const len = Math.hypot(vx, vy);
    if (len > maxSpeed) {
      const s = maxSpeed / len;
      vx *= s;
      vy *= s;
    }
    velocity.vel.x = vx;
    velocity.vel.y = vy;
    transform.position.x += vx * time.dt;
    transform.position.y += vy * time.dt;
  }
}
