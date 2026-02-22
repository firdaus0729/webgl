import { UniversalCamera, Vector3, Mesh, Ray } from '@babylonjs/core';
import { InputManager } from './input';
import { Health } from './health';
import { Weapon } from './weapon';
import type { IDamageable } from './weapon';
import { GAME_CONSTANTS } from './constants';
import { WeaponModel } from './weaponModel';

export class Player implements IDamageable {
  public camera: UniversalCamera;
  public health: Health;
  public weapon: Weapon;
  private input: InputManager;
  private isDead: boolean = false;
  private canControl: boolean = true;
  private headCollider: Mesh | null = null;
  private bodyCollider: Mesh | null = null;
  private isOnGround: boolean = false;
  private lastGroundCheck: number = 0;
  private weaponModel: WeaponModel | null = null;
  // Camera rotation - CS-like direct control (no smoothing)
  private currentRotationY: number = 0;
  private currentRotationX: number = 0;

  constructor(camera: UniversalCamera, input: InputManager, weapon: Weapon) {
    this.camera = camera;
    this.input = input;
    this.weapon = weapon;
    this.health = new Health();

    // Create head and body colliders for hit detection
    this.createHeadCollider();
    this.createBodyCollider();
    
    // Create first-person weapon model
    const scene = this.camera.getScene();
    if (scene) {
      this.weaponModel = new WeaponModel(scene, this.camera);
    }

    // Setup health callbacks
    this.health.onDeath(() => {
      this.isDead = true;
      this.canControl = false;
    });
  }

  private createHeadCollider(): void {
    if (!this.camera?.getScene()) return;

    this.headCollider = Mesh.CreateSphere('playerHead', 8, 0.3, this.camera.getScene()!);
    this.headCollider.isVisible = false;
    this.headCollider.checkCollisions = false;
    this.headCollider.isPickable = true; // Enable raycasting for headshots
    
    // Position head collider relative to camera
    this.updateHeadColliderPosition();
  }

  private createBodyCollider(): void {
    if (!this.camera?.getScene()) return;

    this.bodyCollider = Mesh.CreateBox('playerBody', 1, this.camera.getScene()!);
    this.bodyCollider.isVisible = false; // Invisible in first-person view
    this.bodyCollider.checkCollisions = false;
    this.bodyCollider.isPickable = true; // Enable raycasting
    this.bodyCollider.scaling = new Vector3(0.8, 2, 0.8); // Make it human-sized
    
    // Position body collider relative to camera
    this.updateBodyColliderPosition();
  }

  private updateHeadColliderPosition(): void {
    if (!this.headCollider) return;

    const headOffset = new Vector3(0, 0.5, 0);
    this.headCollider.position = this.camera.position.clone().add(headOffset);
  }

  private updateBodyColliderPosition(): void {
    if (!this.bodyCollider) return;

    const bodyOffset = new Vector3(0, -0.5, 0);
    this.bodyCollider.position = this.camera.position.clone().add(bodyOffset);
  }

  public update(deltaTime: number): void {
    if (!this.canControl) return;

    // Update collider positions
    this.updateHeadColliderPosition();
    this.updateBodyColliderPosition();
    
    // Update weapon model position
    if (this.weaponModel) {
      this.weaponModel.updatePosition();
    }

    // Handle mouse look - CS-like direct, responsive control
    // UniversalCamera uses rotation directly - NO setTarget() to avoid interference
    if (this.input.isPointerLocked()) {
      const mouseDelta = this.input.getMouseDelta();
      
      // CS-like: Direct, immediate response with no interpolation lag
      // Sensitivity tuned for precise, responsive feel
      const sensitivity = 0.002; // CS-like sensitivity (higher = faster, more responsive)
      
      // Apply mouse movement directly to camera rotation (no smoothing lag)
      // Always process delta, even if small, for perfect sync
      if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
        // Update rotation directly - immediate response like CS
        this.currentRotationY += mouseDelta.x * sensitivity;
        this.currentRotationX += mouseDelta.y * sensitivity;
        
        // Clamp vertical rotation (prevent over-rotation)
        this.currentRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.currentRotationX));
      }
      
      // Always apply current rotation to camera (ensures perfect sync)
      // This ensures camera rotation is always in sync, even if no new input
      this.camera.rotation.y = this.currentRotationY;
      this.camera.rotation.x = this.currentRotationX;
    }

    // Handle movement
    const moveVector = new Vector3(0, 0, 0);
    
    if (this.input.isKeyPressed('w')) {
      moveVector.z += 1;
    }
    if (this.input.isKeyPressed('s')) {
      moveVector.z -= 1;
    }
    if (this.input.isKeyPressed('a')) {
      moveVector.x -= 1;
    }
    if (this.input.isKeyPressed('d')) {
      moveVector.x += 1;
    }

    // Normalize and apply movement relative to camera rotation
    if (moveVector.length() > 0) {
      moveVector.normalize();
      
      // Calculate forward and right vectors from camera rotation
      const yaw = this.camera.rotation.y;
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      
      // Forward vector (camera's forward direction in XZ plane)
      const forward = new Vector3(sinY, 0, cosY);
      // Right vector (perpendicular to forward)
      const right = new Vector3(cosY, 0, -sinY);
      
      // Calculate movement direction
      const moveDirection = forward.scale(moveVector.z).add(right.scale(moveVector.x));
      moveDirection.normalize();
      
      const moveDistance = GAME_CONSTANTS.MOVE_SPEED * deltaTime;
      const moveDelta = moveDirection.scale(moveDistance);
      
      // Update camera position directly
      const newPos = this.camera.position.clone().add(moveDelta);
      this.camera.position = newPos;
    }

    // Check if on ground (simple raycast down)
    const now = Date.now();
    if (now - this.lastGroundCheck > 50) {
      const scene = this.camera.getScene();
      if (scene) {
        const ray = new Ray(this.camera.position, new Vector3(0, -1, 0));
        const hit = scene.pickWithRay(ray);
        this.isOnGround = !!(hit && hit.hit && (hit.distance || 0) < 1.2);
        this.lastGroundCheck = now;
      }
    }

    // Handle jump
    if (this.input.isKeyPressed(' ') && this.isOnGround) {
      this.camera.cameraDirection.y = GAME_CONSTANTS.JUMP_FORCE;
    }
  }

  private getForwardDirection(): Vector3 {
    const rotation = this.camera.rotation;
    const yaw = rotation.y;
    const pitch = rotation.x;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    return new Vector3(
      sinY * cosP,
      -sinP,
      cosY * cosP
    );
  }

  public getForwardVector(): Vector3 {
    return this.getForwardDirection();
  }

  public getPosition(): Vector3 {
    return this.camera.position.clone();
  }

  public getHeadPosition(): Vector3 {
    return this.camera.position.clone().add(new Vector3(0, 0.5, 0));
  }

  public getHeadCollider(): Mesh | null {
    return this.headCollider;
  }

  public takeDamage(amount: number, isHeadshot: boolean): void {
    this.health.takeDamage(amount, isHeadshot);
  }

  public respawn(spawnPoint: Vector3): void {
    const cameraPos = spawnPoint.clone();
    cameraPos.y = 1.8; // Eye level above ground
    this.camera.position = cameraPos;
    // Reset camera rotation to look forward
    this.currentRotationY = 0;
    this.currentRotationX = 0;
    this.camera.rotation.y = 0; // Look forward
    this.camera.rotation.x = 0; // Level view
    this.health.reset();
    this.isDead = false;
    this.canControl = true;
    this.weapon.reset();
  }

  public setCanControl(canControl: boolean): void {
    this.canControl = canControl;
  }

  public getCanControl(): boolean {
    return this.canControl;
  }

  public isPlayerDead(): boolean {
    return this.isDead;
  }

  public dispose(): void {
    if (this.headCollider) {
      this.headCollider.dispose();
    }
    if (this.bodyCollider) {
      this.bodyCollider.dispose();
    }
    if (this.weaponModel) {
      this.weaponModel.dispose();
    }
  }
}

