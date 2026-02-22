import { Engine, Scene, UniversalCamera, HemisphericLight, Vector3, Mesh, Color3, Color4, StandardMaterial, DirectionalLight, BaseTexture } from '@babylonjs/core';
import { GAME_CONSTANTS } from './constants';

// Prevent duplicate logging in React StrictMode
let hasLoggedRendererInfo = false;

export class GameScene {
  public engine: Engine;
  public scene: Scene;
  public camera: UniversalCamera;
  public ground!: Mesh;
  public platform!: Mesh;
  public cover1!: Mesh;
  public cover2!: Mesh;
  public playerSpawn: Vector3;
  public botSpawn: Vector3;

  constructor(canvas: HTMLCanvasElement) {
    // Check WebGL support - throw so caller can handle (avoids half-constructed scene)
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      const msg = 'WebGL is not supported in this browser. Please use a modern browser with WebGL enabled.';
      console.error(msg);
      throw new Error(msg);
    }

    // Check if hardware acceleration is available (informational only)
    // Prevent duplicate logs from React StrictMode
    if (!hasLoggedRendererInfo) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Only log in development mode, and use info instead of warn for software rendering
        if (import.meta.env.DEV) {
          console.log('WebGL Renderer:', renderer);
          
          // Check if using software rendering (informational, not an error)
          if (renderer.toLowerCase().includes('swiftshader') || 
              renderer.toLowerCase().includes('software')) {
            console.info('Note: Using software rendering. The game will work but may run slower.');
          }
        }
        hasLoggedRendererInfo = true;
      }
    }

    // Create engine
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      powerPreference: 'high-performance', // Prefer hardware acceleration
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.gravity = new Vector3(0, GAME_CONSTANTS.GRAVITY, 0);
    this.scene.collisionsEnabled = true;
    // Soft, sophisticated color palette - warm gray-blue
    this.scene.clearColor = new Color4(0.15, 0.18, 0.22, 1.0);
    
    // Enable image-based lighting for softer, more natural look
    this.scene.environmentIntensity = 0.7;
    (this.scene as { environmentBRDFTexture: BaseTexture | null }).environmentBRDFTexture = null; // Will use default

    // Calculate spawn points first
    const { ARENA_SIZE } = GAME_CONSTANTS;
    this.playerSpawn = new Vector3(-ARENA_SIZE / 2 + 2, 2, 0);
    this.botSpawn = new Vector3(ARENA_SIZE / 2 - 2, 2, 0);

    // Create camera at player spawn (eye level)
    const cameraPos = this.playerSpawn.clone();
    cameraPos.y = 1.8; // Eye level above ground
    this.camera = new UniversalCamera('camera', cameraPos, this.scene);
    
    // Initialize camera rotation to look forward (toward center of arena)
    // UniversalCamera uses rotation directly, not setTarget
    this.camera.rotation.y = 0; // Yaw: 0 = looking forward (positive Z)
    this.camera.rotation.x = 0; // Pitch: 0 = level view
    
    this.camera.ellipsoid = new Vector3(0.5, 1, 0.5);
    this.camera.checkCollisions = true;
    this.camera.applyGravity = true;
    this.camera.speed = 0; // Disable built-in movement speed, we handle it manually
    this.camera.angularSensibility = 2000;
    
    // Set as active camera
    this.scene.activeCamera = this.camera;

    // Professional arena lighting - bright, clear, and natural
    // Main ambient light - bright and neutral for clear visibility
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 1.0; // Brighter for better visibility
    ambientLight.diffuse = new Color3(1.0, 1.0, 1.0); // Pure white for neutral lighting
    ambientLight.groundColor = new Color3(0.8, 0.75, 0.7); // Slightly warm ground reflection
    ambientLight.specular = new Color3(0.2, 0.2, 0.2);
    
    // Primary directional light - strong, clear illumination
    const directionalLight = new DirectionalLight('dirLight', new Vector3(-0.5, -1, -0.3), this.scene);
    directionalLight.intensity = 0.9; // Stronger for better definition
    directionalLight.diffuse = new Color3(1.0, 0.98, 0.96); // Slightly warm, clear light
    directionalLight.specular = new Color3(0.5, 0.5, 0.5); // Stronger specular for polished surfaces
    
    // Secondary fill light for even illumination
    const fillLight = new DirectionalLight('fillLight', new Vector3(0.5, -0.8, 0.2), this.scene);
    fillLight.intensity = 0.4; // Softer fill light
    fillLight.diffuse = new Color3(0.9, 0.92, 0.95); // Cool fill light
    fillLight.specular = new Color3(0.1, 0.1, 0.1);

    // Create arena
    this.createArena();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private createArena(): void {
    const { ARENA_SIZE, PLATFORM_HEIGHT, PLATFORM_SIZE } = GAME_CONSTANTS;

    // Ground - polished concrete/stone floor with high quality
    this.ground = Mesh.CreateGround('ground', ARENA_SIZE, ARENA_SIZE, 64, this.scene); // High segment count for smooth, polished look
    this.ground.position.y = 0;
    this.ground.checkCollisions = true;
    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.5, 0.52, 0.55); // Clean, neutral gray with slight blue tint
    groundMat.specularColor = new Color3(0.4, 0.4, 0.45); // Stronger specular for polished look
    groundMat.ambientColor = new Color3(0.4, 0.4, 0.42); // Higher ambient for better visibility
    groundMat.specularPower = 128; // High power = sharp, polished concrete reflections
    groundMat.emissiveColor = new Color3(0.02, 0.02, 0.025); // Subtle glow for depth
    this.ground.material = groundMat;

    // Platform - elevated metallic platform with clean edges
    this.platform = Mesh.CreateBox('platform', PLATFORM_SIZE, this.scene);
    this.platform.position.y = PLATFORM_HEIGHT / 2;
    this.platform.position.x = 0;
    this.platform.position.z = 0;
    this.platform.scaling.y = PLATFORM_HEIGHT;
    this.platform.checkCollisions = true;
    const platformMat = new StandardMaterial('platformMat', this.scene);
    platformMat.diffuseColor = new Color3(0.7, 0.72, 0.75); // Bright, clean metallic gray
    platformMat.specularColor = new Color3(0.6, 0.6, 0.65); // Strong metallic sheen
    platformMat.ambientColor = new Color3(0.5, 0.5, 0.52);
    platformMat.specularPower = 256; // Very high power = sharp, mirror-like reflections
    platformMat.emissiveColor = new Color3(0.03, 0.03, 0.035); // Subtle glow
    this.platform.material = platformMat;

    // Cover objects - polished wood/steel crates with clean appearance
    this.cover1 = Mesh.CreateBox('cover1', 2, this.scene);
    this.cover1.position.set(-8, 1, -8);
    this.cover1.scaling.set(1, 2, 1);
    this.cover1.checkCollisions = true;
    const coverMat1 = new StandardMaterial('coverMat1', this.scene);
    coverMat1.diffuseColor = new Color3(0.6, 0.5, 0.4); // Rich, polished wood tone
    coverMat1.specularColor = new Color3(0.3, 0.25, 0.2); // Stronger specular for polished wood
    coverMat1.ambientColor = new Color3(0.4, 0.35, 0.3);
    coverMat1.specularPower = 64; // Medium-high power = polished wood surface
    coverMat1.emissiveColor = new Color3(0.01, 0.008, 0.006); // Subtle warm glow
    this.cover1.material = coverMat1;

    this.cover2 = Mesh.CreateBox('cover2', 2, this.scene);
    this.cover2.position.set(8, 1, 8);
    this.cover2.scaling.set(1, 2, 1);
    this.cover2.checkCollisions = true;
    const coverMat2 = new StandardMaterial('coverMat2', this.scene);
    coverMat2.diffuseColor = new Color3(0.6, 0.5, 0.4); // Same rich, polished wood tone
    coverMat2.specularColor = new Color3(0.3, 0.25, 0.2);
    coverMat2.ambientColor = new Color3(0.4, 0.35, 0.3);
    coverMat2.specularPower = 64;
    coverMat2.emissiveColor = new Color3(0.01, 0.008, 0.006);
    this.cover2.material = coverMat2;

    // Spawn points are set in constructor before createArena is called
  }

  public render(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}

