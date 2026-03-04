import type { Vec2 } from './Types';

export type CameraMode = 'side' | 'topdown' | 'endless' | 'static_grid';

export interface Camera2DState {
  mode: CameraMode;
  position: Vec2;
  zoom: number;
  viewWidth: number;
  viewHeight: number;
}

/** World position to canvas pixel (Y flipped for screen) */
export function worldToScreen(
  world: Vec2,
  cameraCenter: Vec2,
  viewWidth: number,
  viewHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const scaleX = canvasWidth / viewWidth;
  const scaleY = canvasHeight / viewHeight;
  const scale = Math.min(scaleX, scaleY);
  const dx = world.x - cameraCenter.x;
  const dy = world.y - cameraCenter.y;
  return {
    x: canvasWidth / 2 + dx * scale,
    y: canvasHeight / 2 - dy * scale,
  };
}
