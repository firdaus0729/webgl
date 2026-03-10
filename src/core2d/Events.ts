import type { EntityId } from './Types';

export type EventType =
  | 'collision'
  | 'trigger_enter'
  | 'trigger_exit'
  | 'entity_died'
  | 'score_changed'
  | 'round_started'
  | 'round_ended'
  | 'level_complete';

export interface CollisionEvent {
  type: 'collision' | 'trigger_enter' | 'trigger_exit';
  a: EntityId;
  b: EntityId;
}

export interface DeathEvent {
  type: 'entity_died';
  entity: EntityId;
  reason?: string;
}

export interface RoundEvent {
  type: 'round_started' | 'round_ended';
  winner?: 'player' | 'opponent' | 'draw';
  /** Optional round number (1-based) */
  round?: number;
  /** Optional score for best-of style modes */
  score?: { player: number; opponent: number };
  /** Optional reason for round ending */
  reason?: 'ko' | 'time';
  /** Optional hint: is the whole match over? */
  isMatchOver?: boolean;
  /** Optional win condition (e.g. first to 2) */
  targetWins?: number;
}

export interface LevelCompleteEvent {
  type: 'level_complete';
  score?: number;
  /** Stars collected (platformer) */
  starsEarned?: number;
  /** Enemies defeated (platformer) */
  enemiesKilled?: number;
  /** Total score displayed on end screen */
  totalScore?: number;
}

export type GameEvent = CollisionEvent | DeathEvent | RoundEvent | LevelCompleteEvent;

type EventHandler = (e: GameEvent) => void;

export class EventBus {
  private listeners: Map<EventType, Set<EventHandler>> = new Map();

  emit(event: GameEvent): void {
    const set = this.listeners.get(event.type as EventType);
    if (set) {
      set.forEach((h) => h(event));
    }
  }

  subscribe(type: EventType, handler: EventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }
}
