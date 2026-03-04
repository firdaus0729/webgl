import type { Component } from '../../core2d/Components';
import type { Vec2 } from '../../core2d/Types';

const LANE_Y = [2, 0, -2];

function clone(components: Component[], position?: Vec2): Component[] {
  return components.map((c) => {
    if (c.kind === 'transform')
      return { ...c, position: position ? { ...position } : { ...c.position }, scale: { ...c.scale } };
    if (c.kind === 'velocity') return { ...c, vel: { ...c.vel } };
    return { ...c };
  });
}

const playerComponents: Component[] = [
  { kind: 'transform', position: { x: 0, y: 0 }, rotation: 0, scale: { x: 0.8, y: 0.8 } },
  { kind: 'velocity', vel: { x: 0, y: 0 } },
  { kind: 'sprite', spriteId: 'runner_player', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 0.8, height: 0.8, isTrigger: false, mask: 1 },
  { kind: 'tag', value: 'player' },
  { kind: 'script', behaviorId: 'runner_player_controller' },
];

const obstacleComponents: Component[] = [
  { kind: 'transform', position: { x: 15, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
  { kind: 'velocity', vel: { x: -8, y: 0 } },
  { kind: 'sprite', spriteId: 'obstacle', layer: 'world' },
  { kind: 'collider', shape: 'rect', width: 1, height: 1, isTrigger: true, mask: 2 },
  { kind: 'tag', value: 'obstacle' },
];

export const RUNNER_LANE_Y = LANE_Y;

export function spawnRunnerPrefab(
  world: { createEntity: (c: Component[]) => number },
  prefabId: 'runner_player' | 'obstacle',
  position: Vec2
): number {
  const components = prefabId === 'runner_player'
    ? clone(playerComponents, position)
    : clone(obstacleComponents, position);
  return world.createEntity(components);
}
