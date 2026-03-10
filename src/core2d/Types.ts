/** Core 2D engine types */

export type Vec2 = { x: number; y: number };

export interface Time {
  dt: number;
  elapsed: number;
}

export type GameModeId = 'boxing' | 'platformer' | 'topdown_arena' | 'endless_runner' | 'grid_board';

export type EntityId = number;

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Clone(v: Vec2): Vec2 {
  return { x: v.x, y: v.y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len === 0) return v;
  return { x: v.x / len, y: v.y / len };
}
