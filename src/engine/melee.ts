import { Scene, Vector3, Ray } from '@babylonjs/core';
import { GAME_CONSTANTS } from './constants';

export type IDamageable = {
  takeDamage(amount: number, isHeadshot: boolean): void;
  getPosition(): Vector3;
  getHeadPosition?(): Vector3;
  getHeadCollider?(): any;
};

export class Melee {
  private scene: Scene;
  private lastAttackTime: number = 0;
  private attackInterval: number;

  constructor(scene: Scene) {
    this.scene = scene;
    this.attackInterval = GAME_CONSTANTS.MELEE_ATTACK_INTERVAL * 1000;
  }

  public canAttack(): boolean {
    const now = Date.now();
    return now - this.lastAttackTime >= this.attackInterval;
  }

  public attack(
    origin: Vector3,
    direction: Vector3,
    damageable: IDamageable | null,
    onHit?: (isHeadshot: boolean) => void
  ): boolean {
    if (!this.canAttack() || !damageable) return false;

    direction = direction.normalize();
    const ray = new Ray(origin, direction, GAME_CONSTANTS.MELEE_RANGE);
    const hit = this.scene.pickWithRay(ray);

    if (!hit?.hit || !hit.pickedMesh) return false;

    const targetPos = damageable.getPosition();
    const distanceToTarget = Vector3.Distance(origin, targetPos);
    if (distanceToTarget > GAME_CONSTANTS.MELEE_RANGE) return false;

    const hitDistance = hit.distance ?? Infinity;
    let hitTarget = false;
    let isHeadshot = false;

    if (damageable.getHeadCollider) {
      const headCollider = damageable.getHeadCollider();
      if (headCollider && hit.pickedMesh === headCollider) {
        hitTarget = true;
        isHeadshot = true;
      }
    }
    if (!hitTarget) {
      if (hit.pickedMesh?.name === 'bot' && Math.abs(hitDistance - distanceToTarget) < 2) hitTarget = true;
      if (!hitTarget && hit.pickedMesh?.name === 'playerBody' && Math.abs(hitDistance - distanceToTarget) < 1.5) hitTarget = true;
    }
    if (!hitTarget) return false;

    if (!isHeadshot && damageable.getHeadPosition) {
      const headPos = damageable.getHeadPosition();
      const headDist = Vector3.Distance(origin, headPos);
      if (Math.abs(hitDistance - headDist) < 0.3 && hitDistance <= headDist + 0.2) isHeadshot = true;
    }

    const damage = isHeadshot ? GAME_CONSTANTS.HEADSHOT_DAMAGE : GAME_CONSTANTS.BODY_DAMAGE;
    damageable.takeDamage(damage, isHeadshot);
    this.lastAttackTime = Date.now();
    if (onHit) onHit(isHeadshot);
    return true;
  }

  public reset(): void {
    this.lastAttackTime = 0;
  }
}
