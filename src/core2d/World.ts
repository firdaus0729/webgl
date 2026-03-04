import type { EntityId } from './Types';
import type { Component, ComponentKind } from './Components';

export interface QueryFilter {
  all?: ComponentKind[];
  tag?: string;
}

export class World {
  private nextId: EntityId = 1;
  private entities: Map<EntityId, Map<ComponentKind, Component>> = new Map();

  createEntity(components: Component[]): EntityId {
    const id = this.nextId++;
    const map = new Map<ComponentKind, Component>();
    for (const c of components) {
      map.set(c.kind, c);
    }
    this.entities.set(id, map);
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
  }

  getComponent<K extends ComponentKind>(
    id: EntityId,
    kind: K
  ): (Component & { kind: K }) | null {
    const map = this.entities.get(id);
    if (!map) return null;
    const c = map.get(kind);
    return (c?.kind === kind ? c : null) as (Component & { kind: K }) | null;
  }

  addComponent(id: EntityId, component: Component): void {
    const map = this.entities.get(id);
    if (map) map.set(component.kind, component);
  }

  removeComponent(id: EntityId, kind: ComponentKind): void {
    this.entities.get(id)?.delete(kind);
  }

  query(filter: QueryFilter): EntityId[] {
    const result: EntityId[] = [];
    const all = filter.all ?? [];
    const tag = filter.tag;

    for (const [id, map] of this.entities) {
      if (tag) {
        const t = map.get('tag') as { value: string } | undefined;
        if (!t || t.value !== tag) continue;
      }
      let ok = true;
      for (const k of all) {
        if (!map.has(k)) {
          ok = false;
          break;
        }
      }
      if (ok) result.push(id);
    }
    return result;
  }

  getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  clear(): void {
    this.entities.clear();
    this.nextId = 1;
  }
}
