import { Scene, Vector3, Ray } from '@babylonjs/core';
import { GAME_CONSTANTS } from './constants';

export type IDamageable = {
  takeDamage(amount: number, isHeadshot: boolean): void;
  getPosition(): Vector3;
  getHeadPosition?(): Vector3;
  getHeadCollider?(): any;
};

export class Weapon {
  private scene: Scene;
  private lastFireTime: number = 0;
  private fireInterval: number;

  constructor(scene: Scene) {
    this.scene = scene;
    this.fireInterval = GAME_CONSTANTS.FIRE_INTERVAL * 1000; // Convert to milliseconds
  }

  public canFire(): boolean {
    const now = Date.now();
    return now - this.lastFireTime >= this.fireInterval;
  }

  public fire(
    origin: Vector3,
    direction: Vector3,
    damageable: IDamageable | null,
    onHit?: (isHeadshot: boolean) => void
  ): boolean {
    if (!this.canFire()) {
      return false;
    }

    this.lastFireTime = Date.now();

    if (!damageable) {
      return false;
    }

    // Raycast from origin in direction
    const ray = new Ray(origin, direction);
    const hit = this.scene.pickWithRay(ray);

    if (!hit || !hit.hit || !hit.pickedMesh) {
      return false;
    }

    // Check if we actually hit the target's body or head collider
    const targetPos = damageable.getPosition();
    const distanceToTarget = Vector3.Distance(origin, targetPos);
    const hitDistance = hit.distance || Infinity;

    // Check if the hit mesh is actually the target (body or head collider)
    let hitTarget = false;
    let isHeadshot = false;
    
    // First check head collider
    if (damageable.getHeadCollider) {
      const headCollider = damageable.getHeadCollider();
      if (headCollider && hit.pickedMesh === headCollider) {
        hitTarget = true;
        isHeadshot = true;
      }
    }
    
    // Check body collider or bot mesh
    if (!hitTarget) {
      // Check if we hit the bot mesh directly
      if (hit.pickedMesh && hit.pickedMesh.name === 'bot') {
        // Verify it's actually the bot by checking distance
        if (Math.abs(hitDistance - distanceToTarget) < 2.0) {
          hitTarget = true;
        }
      }
      
      // Check if we hit player body collider
      if (!hitTarget && hit.pickedMesh && hit.pickedMesh.name === 'playerBody') {
        // Verify it's actually the player by checking distance
        if (Math.abs(hitDistance - distanceToTarget) < 1.5) {
          hitTarget = true;
        }
      }
    }

    if (hitTarget) {
      // isHeadshot is already set above if we hit the head collider
      // If we hit body but want to check for headshot, verify distance
      if (!isHeadshot && damageable.getHeadPosition) {
        const headPos = damageable.getHeadPosition();
        const headDistance = Vector3.Distance(origin, headPos);
        // If hit distance is very close to head distance, it might be a headshot
        if (Math.abs(hitDistance - headDistance) < 0.3 && hitDistance <= headDistance + 0.2) {
          isHeadshot = true;
        }
      }

      const damage = isHeadshot 
        ? GAME_CONSTANTS.HEADSHOT_DAMAGE 
        : GAME_CONSTANTS.BODY_DAMAGE;

      damageable.takeDamage(damage, isHeadshot);

      if (onHit) {
        onHit(isHeadshot);
      }

      return true;
    }

    return false;
  }

  public reset(): void {
    this.lastFireTime = 0;
  }
}

