import type { EntityId } from './Types';

export type EventType =
  | 'collision'
  | 'trigger_enter'
  | 'trigger_exit'
  | 'entity_died'
  | 'score_changed'
  | 'round_started'
  | 'round_ended';

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
}

export type GameEvent = CollisionEvent | DeathEvent | RoundEvent;

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
