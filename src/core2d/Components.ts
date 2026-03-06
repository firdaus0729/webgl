import type { Vec2 } from './Types';

export type ComponentKind =
  | 'transform'
  | 'velocity'
  | 'sprite'
  | 'collider'
  | 'body'
  | 'health'
  | 'tag'
  | 'script'
  | 'blocking';

export interface Transform2D {
  kind: 'transform';
  position: Vec2;
  rotation: number;
  scale: Vec2;
}

export interface Velocity2D {
  kind: 'velocity';
  vel: Vec2;
}

export interface Sprite {
  kind: 'sprite';
  spriteId: string;
  layer: 'background' | 'world' | 'effects' | 'ui';
}

export interface Collider2D {
  kind: 'collider';
  shape: 'rect' | 'circle';
  width?: number;
  height?: number;
  radius?: number;
  isTrigger: boolean;
  mask: number;
}

export interface Body2D {
  kind: 'body';
  gravity: boolean;
  friction: number;
}

export interface Health {
  kind: 'health';
  current: number;
  max: number;
}

export interface Tag {
  kind: 'tag';
  value: string;
}

export interface Script {
  kind: 'script';
  behaviorId: string;
}

export interface Blocking {
  kind: 'blocking';
  active: boolean;
}

export type Component =
  | Transform2D
  | Velocity2D
  | Sprite
  | Collider2D
  | Body2D
  | Health
  | Tag
  | Script
  | Blocking;
