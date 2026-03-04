import { Scene, Mesh, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';

export class FistModel {
  private scene: Scene;
  private fistMesh: Mesh | null = null;
  private forearmMesh: Mesh | null = null;
  private parentCamera: any;

  constructor(scene: Scene, camera: any) {
    this.scene = scene;
    this.parentCamera = camera;
    this.createFistModel();
  }

  private createFistModel(): void {
    const skinMat = new StandardMaterial('fistSkin', this.scene);
    skinMat.diffuseColor = new Color3(0.88, 0.72, 0.58);
    skinMat.specularColor = new Color3(0.15, 0.12, 0.1);
    skinMat.ambientColor = new Color3(0.4, 0.35, 0.3);
    skinMat.specularPower = 8;

    this.forearmMesh = Mesh.CreateBox('forearm', 0.2, this.scene);
    this.forearmMesh.scaling = new Vector3(0.15, 0.5, 0.2);
    this.forearmMesh.material = skinMat;
    this.forearmMesh.renderingGroupId = 1;

    this.fistMesh = Mesh.CreateBox('fist', 0.2, this.scene);
    this.fistMesh.scaling = new Vector3(0.35, 0.35, 0.35);
    this.fistMesh.material = skinMat;
    this.fistMesh.renderingGroupId = 1;

    this.updatePosition();
  }

  public updatePosition(): void {
    if (!this.fistMesh || !this.forearmMesh || !this.parentCamera) return;

    const yaw = this.parentCamera.rotation.y;
    const pitch = this.parentCamera.rotation.x;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const forward = new Vector3(sinY * cosP, -sinP, cosY * cosP);
    const right = new Vector3(cosY, 0, -sinY);
    const up = Vector3.Cross(right, forward).normalize();

    const handOffset = forward.scale(0.5).add(right.scale(0.25)).add(up.scale(-0.35));
    this.forearmMesh.position = this.parentCamera.position.clone().add(handOffset);
    this.forearmMesh.rotation = this.parentCamera.rotation.clone();
    this.forearmMesh.rotation.x += 0.1;

    const fistOffset = forward.scale(0.65).add(right.scale(0.25)).add(up.scale(-0.35));
    this.fistMesh.position = this.parentCamera.position.clone().add(fistOffset);
    this.fistMesh.rotation = this.parentCamera.rotation.clone();
    this.fistMesh.rotation.x += 0.05;

    this.forearmMesh.alwaysSelectAsActiveMesh = true;
    this.fistMesh.alwaysSelectAsActiveMesh = true;
  }

  public dispose(): void {
    this.forearmMesh?.dispose();
    this.fistMesh?.dispose();
  }
}
