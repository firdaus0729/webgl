import type { Component } from '../../core2d/Components';
import type { Vec2 } from '../../core2d/Types';

export interface Prefab {
  id: string;
  components: Component[];
}

function cloneComponents(components: Component[], overrides: { position?: Vec2 }): Component[] {
  return components.map((c) => {
    if (c.kind === 'transform') {
      return {
        ...c,
        position: overrides.position ? { ...overrides.position } : { ...c.position },
        scale: { ...c.scale },
      };
    }
    if (c.kind === 'velocity') return { ...c, vel: { ...c.vel } };
    return { ...c };
  });
}

const playerComponents: Component[] = [
  { kind: 'transform', position: { x: 2, y: 2 }, rotation: 0, scale: { x: 0.8, y: 1.2 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'platformer_player', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 0.8, height: 1.2, isTrigger: false, mask: 0b11 },
  { kind: 'body', gravity: true, friction: 0 },
  { kind: 'health', current: 3, max: 3 },
  { kind: 'tag', value: 'player' },
  { kind: 'script', behaviorId: 'player_platformer' },
];

const platformComponents: Component[] = [
  { kind: 'transform', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
  { kind: 'sprite', spriteId: 'platform', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 4, height: 1, isTrigger: false, mask: 0b01 },
  { kind: 'tag', value: 'platform' },
];

const enemyComponents: Component[] = [
  { kind: 'transform', position: { x: 10, y: 0 }, rotation: 0, scale: { x: 0.8, y: 1 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'enemy', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 0.8, height: 1, isTrigger: false, mask: 0b11 },
  { kind: 'body', gravity: true, friction: 0 },
  { kind: 'tag', value: 'enemy' },
  { kind: 'script', behaviorId: 'enemy_platformer' },
];

const coinComponents: Component[] = [
  { kind: 'transform', position: { x: 5, y: 3 }, rotation: 0, scale: { x: 0.5, y: 0.5 } },
  { kind: 'sprite', spriteId: 'coin', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 0.6, height: 0.6, isTrigger: true, mask: 0b10 },
  { kind: 'tag', value: 'coin' },
];

const movingPlatformComponents: Component[] = [
  { kind: 'transform', position: { x: 12, y: 1 }, rotation: 0, scale: { x: 3, y: 0.8 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'platform_moving', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 3, height: 0.8, isTrigger: false, mask: 0b01 },
  { kind: 'body', gravity: false, friction: 0 },
  { kind: 'tag', value: 'platform_moving' },
  { kind: 'script', behaviorId: 'moving_platform' },
];

const goalComponents: Component[] = [
  { kind: 'transform', position: { x: 26, y: 0 }, rotation: 0, scale: { x: 1, y: 2 } },
  { kind: 'sprite', spriteId: 'goal_flag', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 1, height: 2, isTrigger: true, mask: 0b10 },
  { kind: 'tag', value: 'goal' },
];

const starComponents: Component[] = [
  { kind: 'transform', position: { x: 7, y: 2 }, rotation: 0, scale: { x: 0.6, y: 0.6 } },
  { kind: 'sprite', spriteId: 'star', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 0.6, height: 0.6, isTrigger: true, mask: 0b10 },
  { kind: 'tag', value: 'star' },
];

const bridgeComponents: Component[] = [
  { kind: 'transform', position: { x: 15, y: 0 }, rotation: 0, scale: { x: 6, y: 0.8 } },
  { kind: 'sprite', spriteId: 'bridge', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 6, height: 0.8, isTrigger: false, mask: 0b01 },
  { kind: 'tag', value: 'platform' },
];

export const platformerPrefabs: Prefab[] = [
  { id: 'platformer_player', components: playerComponents },
  { id: 'platform', components: platformComponents },
  { id: 'bridge', components: bridgeComponents },
  { id: 'enemy', components: enemyComponents },
  { id: 'coin', components: coinComponents },
  { id: 'star', components: starComponents },
  { id: 'moving_platform', components: movingPlatformComponents },
  { id: 'goal', components: goalComponents },
];

export function spawnPlatformerPrefab(
  world: { createEntity: (components: Component[]) => number },
  prefabId: string,
  position?: Vec2
): number {
  const prefab = platformerPrefabs.find((p) => p.id === prefabId);
  if (!prefab) throw new Error(`Unknown prefab: ${prefabId}`);
  return world.createEntity(cloneComponents(prefab.components, { position }));
}
