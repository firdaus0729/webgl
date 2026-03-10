import type { World } from '../World';
import type { Vec2 } from '../Types';
import type { GameModeId } from '../Types';
import { worldToScreen } from '../Camera2D';

const LAYER_ORDER: ('background' | 'world' | 'effects' | 'ui')[] = ['background', 'world', 'effects', 'ui'];

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
  platformer_player: '#e85d04',
  platform: '#8B4513',
  platform_moving: '#94a3b8',
  bridge: '#5c4033',
  goal: '#22c55e',
  goal_flag: '#22c55e',
  enemy: '#6b4423',
  coin: '#eab308',
  star: '#ffd700',
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
  modeId?: GameModeId;
}

function toScreen(
  world: Vec2,
  renderCtx: RenderContext
): { x: number; y: number; scale: number } {
  const { cameraCenter, viewWidth, viewHeight, canvasWidth, canvasHeight } = renderCtx;
  const scale = Math.min(canvasWidth / viewWidth, canvasHeight / viewHeight);
  const s = worldToScreen(world, cameraCenter, viewWidth, viewHeight, canvasWidth, canvasHeight);
  return { x: s.x, y: s.y, scale };
}

function drawBoxingArena(ctx: CanvasRenderingContext2D, renderCtx: RenderContext, world: World): void {
  const { canvasWidth, canvasHeight, viewWidth, viewHeight, cameraCenter } = renderCtx;
  const scale = Math.min(canvasWidth / viewWidth, canvasHeight / viewHeight);
  const ringCenter = worldToScreen(
    { x: 0, y: 0 },
    cameraCenter,
    viewWidth,
    viewHeight,
    canvasWidth,
    canvasHeight
  );

  ctx.fillStyle = '#1a0f0a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  let ringW = 16 * scale;
  let ringH = 6 * scale;
  const ringIds = world.query({ tag: 'ring' });
  if (ringIds.length > 0) {
    const collider = world.getComponent(ringIds[0], 'collider');
    if (collider?.shape === 'rect' && collider.width != null && collider.height != null) {
      ringW = collider.width * scale;
      ringH = collider.height * scale;
    }
  }
  const rx = ringCenter.x - ringW / 2;
  const rty = ringCenter.y - ringH / 2;

  for (let row = 0; row < 4; row++) {
    const y = row % 2 === 0 ? ringCenter.y + ringH / 2 + 25 + row * 28 : ringCenter.y - ringH / 2 - 25 - row * 28;
    for (let i = 0; i < 24; i++) {
      const x = ringCenter.x - ringW / 2 - 40 + (i / 24) * (ringW + 80);
      const hue = 20 + Math.sin(i * 0.5) * 15;
      ctx.fillStyle = `hsl(${hue}, 45%, ${35 + (row % 2) * 10}%)`;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#4a3728';
  ctx.lineWidth = 4;
  ctx.strokeRect(rx - 2, rty - 2, ringW + 4, ringH + 4);

  ctx.fillStyle = '#3d2318';
  ctx.fillRect(rx, rty, ringW, ringH);

  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 2;
  ctx.strokeRect(rx + 4, rty + 4, ringW - 8, ringH - 8);

  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(rx + 8, rty + 8, ringW - 16, ringH - 16);

  const ropeYs = [rty + 2, rty + ringH / 4, rty + ringH / 2, rty + (3 * ringH) / 4, rty + ringH - 2];
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 3;
  for (const rpy of ropeYs) {
    ctx.beginPath();
    ctx.moveTo(rx, rpy);
    ctx.lineTo(rx + ringW, rpy);
    ctx.stroke();
  }
}

function drawBoxer(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number; scale: number },
  pw: number,
  ph: number,
  spriteId: string,
  _world: World,
  _id: number
): void {
  const isPlayer = spriteId === 'boxer_blue';
  const bodyColor = spriteId === 'boxer_blue' ? '#2980b9' : '#c0392b';
  const skin = '#e8c4a0';
  const glove = isPlayer ? '#3498db' : '#e74c3c';
  const x = screen.x;
  const y = screen.y;
  const headR = Math.min(pw, ph) * 0.35;
  const bodyH = ph * 0.55;
  const bodyW = pw * 0.7;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(x - bodyW / 2, y + headR - 2, bodyW, bodyH);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - bodyW / 2, y + headR - 2, bodyW, bodyH);

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, y - bodyH * 0.15, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const gloveW = pw * 0.22;
  const gloveH = ph * 0.18;
  ctx.fillStyle = glove;
  ctx.fillRect(x - bodyW / 2 - gloveW * 0.5, y + headR * 0.5, gloveW, gloveH);
  ctx.fillRect(x + bodyW / 2 - gloveW * 0.5, y + headR * 0.5, gloveW, gloveH);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - bodyW / 2 - gloveW * 0.5, y + headR * 0.5, gloveW, gloveH);
  ctx.strokeRect(x + bodyW / 2 - gloveW * 0.5, y + headR * 0.5, gloveW, gloveH);
}

function drawPlatformerBackground(ctx: CanvasRenderingContext2D, renderCtx: RenderContext): void {
  const { canvasWidth, canvasHeight } = renderCtx;
  const grad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  grad.addColorStop(0, '#87ceeb');
  grad.addColorStop(0.6, '#b0e0e6');
  grad.addColorStop(1, '#98d8e8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const scale = Math.min(canvasWidth / renderCtx.viewWidth, canvasHeight / renderCtx.viewHeight);
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const camX = renderCtx.cameraCenter.x * scale;
  const camY = renderCtx.cameraCenter.y * scale;

  for (let i = 0; i < 8; i++) {
    const wx = (i - 4) * 25 - (camX - cx);
    const wy = -80 + (i % 3) * 40 - (cy - camY);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(cx + wx, cy + wy, 35, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatformBrick(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number; scale: number },
  w: number,
  h: number,
  isBridge: boolean
): void {
  const base = isBridge ? '#5c4033' : '#8B4513';
  ctx.fillStyle = base;
  ctx.fillRect(screen.x - w / 2, screen.y - h / 2, w, h);
  const brickW = w / 4;
  const brickH = h / 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const bx = screen.x - w / 2 + col * brickW;
      const by = screen.y - h / 2 + row * brickH;
      ctx.strokeRect(bx, by, brickW, brickH);
    }
  }
  if (!isBridge) {
    ctx.fillStyle = 'rgba(139,69,19,0.4)';
    ctx.fillRect(screen.x - w / 2, screen.y - h / 2, w, h);
  }
}

function drawGoalFlag(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number; scale: number },
  w: number,
  h: number
): void {
  const poleW = w * 0.15;
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(screen.x - poleW / 2, screen.y - h / 2, poleW, h);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(screen.x + poleW / 2, screen.y - h / 2);
  ctx.lineTo(screen.x + w * 0.6, screen.y - h / 4);
  ctx.lineTo(screen.x + poleW / 2, screen.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMarioPlayer(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number; scale: number },
  pw: number,
  ph: number
): void {
  const x = screen.x;
  const y = screen.y;
  const headR = Math.min(pw, ph) * 0.35;
  ctx.fillStyle = '#e8c4a0';
  ctx.beginPath();
  ctx.arc(x, y - ph * 0.15, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e85d04';
  ctx.fillRect(x - pw * 0.35, y - ph * 0.1, pw * 0.7, ph * 0.5);
  ctx.fillStyle = '#1a472a';
  ctx.fillRect(x - pw * 0.4, y + ph * 0.35, pw * 0.35, ph * 0.35);
  ctx.fillRect(x + pw * 0.05, y + ph * 0.35, pw * 0.35, ph * 0.35);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMarioEnemy(
  ctx: CanvasRenderingContext2D,
  screen: { x: number; y: number; scale: number },
  pw: number,
  ph: number
): void {
  const x = screen.x;
  const y = screen.y;
  ctx.fillStyle = '#6b4423';
  ctx.beginPath();
  ctx.ellipse(x, y, pw * 0.45, ph * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a2e15';
  ctx.beginPath();
  ctx.arc(x - pw * 0.2, y - ph * 0.1, pw * 0.15, 0, Math.PI * 2);
  ctx.arc(x + pw * 0.2, y - ph * 0.1, pw * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawStar(ctx: CanvasRenderingContext2D, screen: { x: number; y: number; scale: number }, size: number): void {
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#daa520';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * 0.4;
    const x = screen.x + Math.cos(a) * r;
    const y = screen.y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function renderSystem(world: World, renderCtx: RenderContext): void {
  const { ctx, canvasWidth, canvasHeight, modeId } = renderCtx;

  if (modeId === 'boxing') {
    drawBoxingArena(ctx, renderCtx, world);
  } else if (modeId === 'platformer') {
    drawPlatformerBackground(ctx, renderCtx);
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

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
      const tag = world.getComponent(id, 'tag');
      if (!transform || !sprite) continue;
      const screen = toScreen(transform.position, renderCtx);
      let w = 1,
        h = 1;
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
      const scale = screen.scale;
      const pw = modeId === 'boxing' && (sprite.spriteId === 'boxer_blue' || sprite.spriteId === 'boxer_red') ? Math.max(BOXER_MIN_PX, w * scale) : w * scale;
      const ph = modeId === 'boxing' && (sprite.spriteId === 'boxer_blue' || sprite.spriteId === 'boxer_red') ? Math.max(BOXER_MIN_PX, h * scale) : h * scale;

      if (modeId === 'boxing' && (sprite.spriteId === 'boxer_blue' || sprite.spriteId === 'boxer_red')) {
        drawBoxer(ctx, screen, pw, ph, sprite.spriteId, world, id);
        continue;
      }

      if (modeId === 'platformer') {
        if (sprite.spriteId === 'platform' || sprite.spriteId === 'platform_moving') {
          drawPlatformBrick(ctx, screen, pw, ph, false);
          continue;
        }
        if (sprite.spriteId === 'bridge') {
          drawPlatformBrick(ctx, screen, pw, ph, true);
          continue;
        }
        if (sprite.spriteId === 'goal' || sprite.spriteId === 'goal_flag') {
          drawGoalFlag(ctx, screen, pw, ph);
          continue;
        }
        if (sprite.spriteId === 'platformer_player') {
          drawMarioPlayer(ctx, screen, pw, ph);
          continue;
        }
        if (sprite.spriteId === 'enemy') {
          drawMarioEnemy(ctx, screen, pw, ph);
          continue;
        }
        if (sprite.spriteId === 'star') {
          drawStar(ctx, screen, Math.min(pw, ph) * 0.5);
          continue;
        }
      }

      ctx.fillStyle = spriteColors[sprite.spriteId] ?? spriteColors.default;
      ctx.fillRect(screen.x - pw / 2, screen.y - ph / 2, pw, ph);
      if (tag?.value === 'coin' || sprite.spriteId === 'coin') {
        ctx.strokeStyle = '#b8860b';
        ctx.lineWidth = 1;
        ctx.strokeRect(screen.x - pw / 2, screen.y - ph / 2, pw, ph);
      }
    }
  }
}
