import type { Component } from '../../core2d/Components';
import type { Vec2 } from '../../core2d/Types';

const playerComponents: Component[] = [
  { kind: 'transform', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'arena_player', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 1, height: 1, isTrigger: false, mask: 0b11 },
  { kind: 'body', gravity: false, friction: 0 },
  { kind: 'health', current: 100, max: 100 },
  { kind: 'tag', value: 'player' },
  { kind: 'script', behaviorId: 'player_arena_shooter' },
];

const bulletComponents: Component[] = [
  { kind: 'transform', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 0.3, y: 0.3 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'bullet', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 0.3, height: 0.3, isTrigger: true, mask: 0b10 },
  { kind: 'tag', value: 'bullet' },
];

const enemyComponents: Component[] = [
  { kind: 'transform', position: { x: 5, y: 5 }, rotation: 0, scale: { x: 1, y: 1 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'enemy_arena', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 1, height: 1, isTrigger: false, mask: 0b11 },
  { kind: 'body', gravity: false, friction: 0 },
  { kind: 'health', current: 2, max: 2 },
  { kind: 'tag', value: 'enemy' },
  { kind: 'script', behaviorId: 'enemy_chaser' },
];

export const arenaPrefabs = {
  player: playerComponents,
  bullet: bulletComponents,
  enemy: enemyComponents,
};

export function spawnArenaPrefab(
  world: { createEntity: (c: Component[]) => number },
  prefabId: keyof typeof arenaPrefabs,
  overrides?: { position?: Vec2; vel?: Vec2 }
): number {
  const components = arenaPrefabs[prefabId].map((c) => {
    if (c.kind === 'transform' && overrides?.position) {
      return { ...c, position: { ...overrides.position } };
    }
    if (c.kind === 'velocity' && overrides?.vel) {
      return { ...c, vel: { ...overrides.vel } };
    }
    if (c.kind === 'health' && prefabId === 'enemy') {
      return { ...c };
    }
    return { ...c };
  });
  return world.createEntity(components);
}
