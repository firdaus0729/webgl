import type { Component } from '../../core2d/Components';
import type { Vec2 } from '../../core2d/Types';

export interface Prefab {
  id: string;
  components: Component[];
}

function clone(components: Component[], position?: Vec2): Component[] {
  return components.map((c) => {
    if (c.kind === 'transform') {
      return {
        ...c,
        position: position ? { ...position } : { ...c.position },
        scale: { ...c.scale },
      };
    }
    if (c.kind === 'velocity') return { ...c, vel: { ...c.vel } };
    return { ...c };
  });
}

const playerComponents: Component[] = [
  { kind: 'transform', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 0.8, y: 0.8 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'arena_player', layer: 'world' },
  { kind: 'collider', shape: 'circle', radius: 0.4, isTrigger: false, mask: 1 },
  { kind: 'health', current: 100, max: 100 },
  { kind: 'tag', value: 'player' },
  { kind: 'script', behaviorId: 'player_arena_shooter' },
];

const enemyComponents: Component[] = [
  { kind: 'transform', position: { x: 5, y: 5 }, rotation: 0, scale: { x: 0.7, y: 0.7 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'enemy_arena', layer: 'world' },
  { kind: 'collider', shape: 'circle', radius: 0.35, isTrigger: false, mask: 2 },
  { kind: 'health', current: 30, max: 30 },
  { kind: 'tag', value: 'enemy' },
  { kind: 'script', behaviorId: 'enemy_chaser' },
];

const bulletComponents: Component[] = [
  { kind: 'transform', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 0.2, y: 0.2 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'bullet', layer: 'effects' },
  { kind: 'collider', shape: 'circle', radius: 0.15, isTrigger: true, mask: 4 },
  { kind: 'tag', value: 'bullet' },
];

export const arenaPrefabs = {
  arena_player: { id: 'arena_player', components: playerComponents },
  enemy_arena: { id: 'enemy_arena', components: enemyComponents },
  bullet: { id: 'bullet', components: bulletComponents },
};

export function spawnArenaPrefab(
  world: { createEntity: (c: Component[]) => number },
  prefabId: keyof typeof arenaPrefabs,
  position: Vec2,
  extra?: { vel?: Vec2 }
): number {
  const prefab = arenaPrefabs[prefabId];
  if (!prefab) throw new Error(`Unknown prefab: ${prefabId}`);
  const components = clone(prefab.components, position);
  if (extra?.vel) {
    const v = components.find((c) => c.kind === 'velocity');
    if (v && v.kind === 'velocity') v.vel = { ...extra.vel };
  }
  return world.createEntity(components);
}
