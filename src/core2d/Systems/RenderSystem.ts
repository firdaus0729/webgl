import type { World } from '../World';
import type { Vec2 } from '../Types';
import { worldToScreen } from '../Camera2D';

const LAYER_ORDER: ('background' | 'world' | 'effects' | 'ui')[] = ['background', 'world', 'effects', 'ui'];

/** Simple sprite registry: spriteId -> fill color (for Week 1) */
const spriteColors: Record<string, string> = {
  boxer_blue: '#3498db',
  boxer_red: '#e74c3c',
  hitbox: 'rgba(255,200,0,0.6)',
  ring: '#2c3e50',
  arena_player: '#4ade80',
  enemy_arena: '#f87171',
  bullet: '#fbbf24',
  runner_player: '#60a5fa',
  obstacle: '#78716c',
  board_slot: '#334155',
  token_red: '#dc2626',
  token_yellow: '#eab308',
  default: '#95a5a6',
};
const BOXER_MIN_PX = 24;

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  cameraCenter: Vec2;
  viewWidth: number;
  viewHeight: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function renderSystem(world: World, renderCtx: RenderContext): void {
  const { ctx, cameraCenter, viewWidth, viewHeight, canvasWidth, canvasHeight } = renderCtx;
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  for (const layer of LAYER_ORDER) {
    const ids = world.query({ all: ['transform', 'sprite'] });
    const withLayer = ids.filter((id) => {
      const s = world.getComponent(id, 'sprite');
      return s?.layer === layer;
    });
    for (const id of withLayer) {
      const transform = world.getComponent(id, 'transform');
      const sprite = world.getComponent(id, 'sprite');
      const collider = world.getComponent(id, 'collider');
      if (!transform || !sprite) continue;
      const screen = worldToScreen(
        transform.position,
        cameraCenter,
        viewWidth,
        viewHeight,
        canvasWidth,
        canvasHeight
      );
      let w = 1, h = 1;
      if (collider?.shape === 'rect' && collider.width != null && collider.height != null) {
        w = collider.width * (transform.scale?.x ?? 1);
        h = collider.height * (transform.scale?.y ?? 1);
      } else if (collider?.shape === 'circle' && collider.radius != null) {
        w = collider.radius * 2 * (transform.scale?.x ?? 1);
        h = collider.radius * 2 * (transform.scale?.y ?? 1);
      } else {
        w = transform.scale?.x ?? 1;
        h = transform.scale?.y ?? 1;
      }
      const scale = Math.min(canvasWidth / viewWidth, canvasHeight / viewHeight);
      const pw = Math.max(BOXER_MIN_PX, w * scale);
      const ph = Math.max(BOXER_MIN_PX, h * scale);
      ctx.fillStyle = spriteColors[sprite.spriteId] ?? spriteColors.default;
      ctx.fillRect(screen.x - pw / 2, screen.y - ph / 2, pw, ph);
      if (sprite.spriteId === 'boxer_blue' || sprite.spriteId === 'boxer_red') {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(screen.x - pw / 2, screen.y - ph / 2, pw, ph);
      }
    }
  }
}
