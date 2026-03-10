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
    if (c.kind === 'velocity') {
      return { ...c, vel: { ...c.vel } };
    }
    if (c.kind === 'health') {
      return { ...c };
    }
    if (c.kind === 'blocking') {
      return { ...c };
    }
    if (c.kind === 'stamina') {
      return { ...c };
    }
    return { ...c };
  });
}

const boxerPlayerComponents: Component[] = [
  { kind: 'transform', position: { x: -5, y: 0 }, rotation: 0, scale: { x: 1, y: 2 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'boxer_blue', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 1, height: 2, isTrigger: false, mask: 0b11 },
  { kind: 'health', current: 100, max: 100 },
  { kind: 'stamina', current: 100, max: 100 },
  { kind: 'tag', value: 'player' },
  { kind: 'blocking', active: false },
  { kind: 'script', behaviorId: 'player_boxer_controller' },
];

const boxerAIComponents: Component[] = [
  { kind: 'transform', position: { x: 5, y: 0 }, rotation: 0, scale: { x: 1, y: 2 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'boxer_red', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 1, height: 2, isTrigger: false, mask: 0b11 },
  { kind: 'health', current: 100, max: 100 },
  { kind: 'stamina', current: 100, max: 100 },
  { kind: 'tag', value: 'opponent' },
  { kind: 'blocking', active: false },
  { kind: 'script', behaviorId: 'ai_boxer_aggressive' },
];

export const boxingPrefabs: Prefab[] = [
  { id: 'boxer_player', components: boxerPlayerComponents },
  { id: 'boxer_ai', components: boxerAIComponents },
];

export function spawnFromPrefab(
  world: { createEntity: (components: Component[]) => number },
  prefabId: string,
  position?: Vec2
): number {
  const prefab = boxingPrefabs.find((p) => p.id === prefabId);
  if (!prefab) throw new Error(`Unknown prefab: ${prefabId}`);
  const components = cloneComponents(prefab.components, { position });
  return world.createEntity(components);
}
