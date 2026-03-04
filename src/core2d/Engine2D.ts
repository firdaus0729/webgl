import type { Time, Vec2 } from './Types';
import type { GameModeId } from './Types';
import { vec2 } from './Types';
import { World } from './World';
import { EventBus } from './Events';
import { InputManager } from './Input';
import type { GameModeConfig } from './GameModeConfig';
import { movementSystem } from './Systems/MovementSystem';
import { collisionSystem } from './Systems/CollisionSystem';
import { scriptSystem } from './Systems/ScriptSystem';
import type { BehaviorContext } from './Systems/ScriptSystem';
import { renderSystem, type RenderContext } from './Systems/RenderSystem';

export interface ModeServices {
  getPlayerHealth?(): number;
  getOpponentHealth?(): number;
  getTimeRemaining?(): number;
  getScore?(): { player: number; opponent: number };
}

export interface GameMode {
  id: GameModeId;
  defaultConfig: GameModeConfig;
  setupMatch(world: World, config: GameModeConfig, services: ModeServices): void;
  update?(world: World, time: Time, ctx: { input: InputManager; events: EventBus; services: ModeServices; config: GameModeConfig }): void;
  teardownMatch?(world: World): void;
}

export interface Engine2DOptions {
  canvas: HTMLCanvasElement;
  mode: GameMode;
  config: GameModeConfig;
}

const VIEW_WIDTH = 20;
const VIEW_HEIGHT = 12;

export class Engine2D {
  private canvas: HTMLCanvasElement;
  private mode: GameMode;
  private config: GameModeConfig;
  private world: World;
  private events: EventBus;
  private input: InputManager;
  private services: ModeServices = {};
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private matchStartTime = 0;
  private playerId: number | null = null;
  private opponentId: number | null = null;

  constructor(options: Engine2DOptions) {
    this.canvas = options.canvas;
    this.mode = options.mode;
    this.config = options.config;
    this.world = new World();
    this.events = new EventBus();
    this.input = new InputManager(this.config.inputMapping, this.canvas);

    this.services = {
      getPlayerHealth: () => {
        if (this.playerId == null) return 100;
        const h = this.world.getComponent(this.playerId, 'health');
        return h?.current ?? 100;
      },
      getOpponentHealth: () => {
        if (this.opponentId == null) return 100;
        const h = this.world.getComponent(this.opponentId, 'health');
        return h?.current ?? 100;
      },
      getTimeRemaining: () => {
        const limit = this.config.rules.timeLimit ?? 90;
        const elapsed = (performance.now() / 1000) - this.matchStartTime;
        return Math.max(0, limit - elapsed);
      },
      getScore: () => ({ player: 0, opponent: 0 }),
    };
  }

  start(): void {
    this.world.clear();
    this.matchStartTime = performance.now() / 1000;
    this.mode.setupMatch(this.world, this.config, this.services);
    const playerIds = this.world.query({ tag: 'player' });
    const opponentIds = this.world.query({ tag: 'opponent' });
    this.playerId = playerIds[0] ?? null;
    this.opponentId = opponentIds[0] ?? null;
    this.events.emit({ type: 'round_started' });
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.mode.teardownMatch?.(this.world);
  }

  restart(config?: GameModeConfig): void {
    if (config) this.config = config;
    this.input.setMapping(this.config.inputMapping);
    this.stop();
    this.start();
  }

  getWorld(): World {
    return this.world;
  }

  getConfig(): GameModeConfig {
    return this.config;
  }

  getEvents(): EventBus {
    return this.events;
  }

  getInput(): InputManager {
    return this.input;
  }

  getServices(): ModeServices {
    return this.services;
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    const elapsed = (now / 1000) - this.matchStartTime;
    const time: Time = { dt, elapsed };

    const gravity = this.config.physics.gravity ?? vec2(0, 0);
    const maxSpeed = this.config.physics.maxSpeed ?? 10;
    movementSystem(this.world, time, gravity, maxSpeed);
    collisionSystem(this.world, this.events);

    const behaviorCtx: BehaviorContext = {
      world: this.world,
      time,
      input: this.input,
      events: this.events,
    };
    scriptSystem(this.world, time, behaviorCtx);

    this.mode.update?.(this.world, time, {
      input: this.input,
      events: this.events,
      services: this.services,
      config: this.config,
    });

    const cameraCenter = this.getCameraCenter();
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      const renderCtx: RenderContext = {
        ctx,
        cameraCenter,
        viewWidth: VIEW_WIDTH,
        viewHeight: VIEW_HEIGHT,
        canvasWidth: this.canvas.width,
        canvasHeight: this.canvas.height,
      };
      renderSystem(this.world, renderCtx);
    }

    this.input.consumeJustPressed();
  };

  private getCameraCenter(): Vec2 {
    if (this.config.camera.mode === 'static_grid') return { x: 0, y: 0 };
    const followTag = this.config.camera.followTag;
    if (followTag && this.playerId != null) {
      const t = this.world.getComponent(this.playerId, 'transform');
      if (t) return { x: t.position.x, y: t.position.y };
    }
    return { x: 0, y: 0 };
  }
}
