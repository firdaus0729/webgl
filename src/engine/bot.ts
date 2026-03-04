import { Scene, Vector3, Mesh, StandardMaterial, Color3 } from '@babylonjs/core';
import { Health } from './health';
import { Melee } from './melee';
import type { IDamageable } from './melee';
import { GAME_CONSTANTS } from './constants';

export class Bot implements IDamageable {
  public mesh: Mesh;
  public health: Health;
  public melee: Melee;
  private headCollider: Mesh;
  private strafeDirection: number = 1;
  private strafeChangeTime: number = 0;
  private state: 'idle' | 'chasing' | 'attacking' = 'idle';

  constructor(scene: Scene, spawnPoint: Vector3, melee: Melee) {
    this.melee = melee;

    // Create bot mesh - make it taller and VERY visible
    this.mesh = Mesh.CreateBox('bot', 1, scene);
    this.mesh.scaling = new Vector3(0.8, 2, 0.8); // Make it human-sized (taller)
    this.mesh.position = spawnPoint.clone();
    this.mesh.position.y = 1; // Position bottom at ground level, so center is at y=1
    this.mesh.checkCollisions = true;
    this.mesh.ellipsoid = new Vector3(0.4, 1, 0.4);
    this.mesh.isPickable = true; // Enable raycasting
    
    const botMat = new StandardMaterial('botMat', scene);
    botMat.diffuseColor = new Color3(0.75, 0.15, 0.15); // Sophisticated dark red, less harsh
    botMat.specularColor = new Color3(0.3, 0.1, 0.1); // Subtle specular highlight
    botMat.ambientColor = new Color3(0.4, 0.1, 0.1); // Soft ambient lighting
    botMat.emissiveColor = new Color3(0.2, 0.05, 0.05); // Subtle glow for visibility without harshness
    botMat.specularPower = 64; // Moderate power = slightly polished surface
    this.mesh.material = botMat;

    // Create head collider
    this.headCollider = Mesh.CreateSphere('botHead', 8, 0.3, scene);
    this.headCollider.isVisible = false;
    this.headCollider.checkCollisions = false;
    this.headCollider.isPickable = true; // Enable raycasting for headshots
    this.updateHeadColliderPosition();

    // Setup health
    this.health = new Health();
    this.health.onDeath(() => {
      // Bot death handled by GameManager
    });
  }

  private updateHeadColliderPosition(): void {
    const headOffset = new Vector3(0, 2, 0); // Head is at top of 2-unit tall body
    this.headCollider.position = this.mesh.position.clone().add(headOffset);
  }

  private faceTarget(target: Vector3): void {
    const direction = target.subtract(this.mesh.position);
    direction.y = 0; // Keep rotation on horizontal plane
    direction.normalize();
    
    if (direction.length() > 0) {
      // Calculate rotation angle
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }

  public update(deltaTime: number, playerPosition: Vector3): void {
    if (this.health.isDead()) return;

    this.updateHeadColliderPosition();

    const distanceToPlayer = Vector3.Distance(this.mesh.position, playerPosition);

    if (distanceToPlayer <= GAME_CONSTANTS.BOT_MELEE_RANGE) {
      this.state = 'attacking';
    } else {
      this.state = 'chasing';
    }

    // Update behavior based on state
    if (this.state === 'chasing') {
      this.chasePlayer(playerPosition, deltaTime);
    } else if (this.state === 'attacking') {
      this.attackPlayer(playerPosition, deltaTime);
    }
  }

  private chasePlayer(playerPosition: Vector3, deltaTime: number): void {
    // Move toward player
    const direction = playerPosition.subtract(this.mesh.position);
    direction.y = 0; // Keep on ground
    direction.normalize();

    // Add strafe
    const now = Date.now();
    if (now - this.strafeChangeTime > 2000) {
      this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
      this.strafeChangeTime = now;
    }

    const strafeAmount = (Math.random() * (GAME_CONSTANTS.BOT_STRAFE_MAX - GAME_CONSTANTS.BOT_STRAFE_MIN) + GAME_CONSTANTS.BOT_STRAFE_MIN) * this.strafeDirection;
    const strafeVector = new Vector3(-direction.z, 0, direction.x).normalize().scale(strafeAmount * deltaTime);

    const moveVector = direction.scale(GAME_CONSTANTS.MOVE_SPEED * deltaTime).add(strafeVector);
    this.mesh.moveWithCollisions(moveVector);

    // Face player
    this.faceTarget(playerPosition);
  }

  private attackPlayer(playerPosition: Vector3, deltaTime: number): void {
    // Strafe while attacking
    const direction = playerPosition.subtract(this.mesh.position);
    direction.y = 0;
    direction.normalize();

    const now = Date.now();
    if (now - this.strafeChangeTime > 1500) {
      this.strafeDirection = Math.random() > 0.5 ? 1 : -1;
      this.strafeChangeTime = now;
    }

    const strafeAmount = (Math.random() * (GAME_CONSTANTS.BOT_STRAFE_MAX - GAME_CONSTANTS.BOT_STRAFE_MIN) + GAME_CONSTANTS.BOT_STRAFE_MIN) * this.strafeDirection;
    const strafeVector = new Vector3(-direction.z, 0, direction.x).normalize().scale(strafeAmount * deltaTime);
    this.mesh.moveWithCollisions(strafeVector);

    this.faceTarget(playerPosition);
  }

  /** Direction from bot toward player (for melee attack). */
  public getAttackDirection(playerPosition: Vector3): Vector3 {
    return playerPosition.subtract(this.mesh.position).normalize();
  }

  public getPosition(): Vector3 {
    return this.mesh.position.clone();
  }

  public getHeadPosition(): Vector3 {
    return this.mesh.position.clone().add(new Vector3(0, 2, 0)); // Head is at top of body
  }

  public getHeadCollider(): Mesh {
    return this.headCollider;
  }

  public takeDamage(amount: number, isHeadshot: boolean): void {
    this.health.takeDamage(amount, isHeadshot);
  }

  public respawn(spawnPoint: Vector3): void {
    this.mesh.position = spawnPoint.clone();
    this.health.reset();
    this.state = 'idle';
    this.melee.reset();
  }

  public dispose(): void {
    this.mesh.dispose();
    this.headCollider.dispose();
  }
}

