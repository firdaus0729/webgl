import { Scene, Mesh, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';

export class WeaponModel {
  private scene: Scene;
  private weaponMesh: Mesh | null = null;
  private handMesh: Mesh | null = null;
  private parentCamera: any;

  constructor(scene: Scene, camera: any) {
    this.scene = scene;
    this.parentCamera = camera;
    this.createWeaponModel();
  }

  private createWeaponModel(): void {
    // Create hand (refined, natural-looking forearm and hand)
    this.handMesh = Mesh.CreateBox('hand', 0.2, this.scene);
    this.handMesh.scaling = new Vector3(0.2, 0.5, 0.2);
    
    const handMat = new StandardMaterial('handMat', this.scene);
    handMat.diffuseColor = new Color3(0.88, 0.72, 0.58); // Natural, warm skin tone
    handMat.specularColor = new Color3(0.15, 0.12, 0.1); // Subtle skin shine
    handMat.ambientColor = new Color3(0.4, 0.35, 0.3); // Soft ambient
    handMat.specularPower = 8; // Very low power = soft, natural skin texture
    this.handMesh.material = handMat;
    this.handMesh.renderingGroupId = 1; // Render on top

    // Create weapon (sophisticated rifle design)
    this.weaponMesh = Mesh.CreateBox('weapon', 0.15, this.scene);
    this.weaponMesh.scaling = new Vector3(0.2, 1.5, 0.2);
    
    const weaponMat = new StandardMaterial('weaponMat', this.scene);
    weaponMat.diffuseColor = new Color3(0.25, 0.25, 0.28); // Sophisticated dark gray-blue
    weaponMat.specularColor = new Color3(0.4, 0.4, 0.45); // Subtle metallic sheen
    weaponMat.ambientColor = new Color3(0.15, 0.15, 0.18); // Soft ambient
    weaponMat.specularPower = 128; // High power = polished metal surface
    this.weaponMesh.material = weaponMat;
    this.weaponMesh.renderingGroupId = 1; // Render on top

    // Position weapon in first-person view (bottom-right of screen)
    this.updatePosition();
  }

  public updatePosition(): void {
    if (!this.handMesh || !this.weaponMesh || !this.parentCamera) return;

    // Get camera forward direction
    const yaw = this.parentCamera.rotation.y;
    const pitch = this.parentCamera.rotation.x;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    
    const forward = new Vector3(sinY * cosP, -sinP, cosY * cosP);
    const right = new Vector3(cosY, 0, -sinY);
    const up = Vector3.Cross(right, forward).normalize();

    // Position relative to camera (first-person view)
    // Hand position: slightly down and to the right, in front of camera
    // More forward and visible position
    const handOffset = forward.scale(0.6).add(right.scale(0.3)).add(up.scale(-0.4));
    this.handMesh.position = this.parentCamera.position.clone().add(handOffset);
    this.handMesh.rotation = this.parentCamera.rotation.clone();
    this.handMesh.rotation.x += 0.1; // Slight tilt downward

    // Weapon position: attached to hand, pointing forward
    // Positioned more forward and visible
    const weaponOffset = forward.scale(0.7).add(right.scale(0.3)).add(up.scale(-0.3));
    this.weaponMesh.position = this.parentCamera.position.clone().add(weaponOffset);
    this.weaponMesh.rotation = this.parentCamera.rotation.clone();
    this.weaponMesh.rotation.x += 0.05; // Slight tilt downward
    
    // Make sure meshes are always visible (disable frustum culling)
    this.handMesh.alwaysSelectAsActiveMesh = true;
    this.weaponMesh.alwaysSelectAsActiveMesh = true;
  }

  public dispose(): void {
    if (this.handMesh) {
      this.handMesh.dispose();
    }
    if (this.weaponMesh) {
      this.weaponMesh.dispose();
    }
  }
}

