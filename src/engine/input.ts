export class InputManager {
  private keys: Set<string> = new Set();
  private mouseButtons: Set<number> = new Set();
  private mouseDeltaX: number = 0;
  private mouseDeltaY: number = 0;
  private pointerLocked: boolean = false;
  private canvas: HTMLCanvasElement | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas || null;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // Mouse
    window.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      // Don't auto-request pointer lock - let the game control when to request it
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
    });

    // Pointer lock
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.pointerLocked;
      this.pointerLocked = document.pointerLockElement !== null;
      
      // Reset mouse delta when pointer lock changes
      if (!wasLocked && this.pointerLocked) {
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
      }
    });

    // Mouse movement - must listen on document for pointer lock
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.pointerLocked) {
        // Accumulate movement deltas (movementX/Y are relative when pointer is locked)
        const deltaX = e.movementX || 0;
        const deltaY = e.movementY || 0;
        
        // Only accumulate if there's actual movement
        if (deltaX !== 0 || deltaY !== 0) {
          this.mouseDeltaX += deltaX;
          this.mouseDeltaY += deltaY;
        }
      } else {
        // Reset deltas when pointer is not locked
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
      }
    });
  }

  public requestPointerLock(): Promise<void> {
    return new Promise((resolve, reject) => {
      const canvas = this.canvas || document.querySelector('canvas');
      if (!canvas || !canvas.requestPointerLock) {
        reject(new Error('Pointer lock not supported'));
        return;
      }

      // Check if already locked
      if (this.pointerLocked && document.pointerLockElement === canvas) {
        resolve();
        return;
      }

      // Set up a one-time listener for pointer lock change
      const onLockChange = () => {
        if (document.pointerLockElement === canvas) {
          this.pointerLocked = true;
          document.removeEventListener('pointerlockchange', onLockChange);
          resolve();
        }
      };

      // Set up error handler with timeout
      const timeout = setTimeout(() => {
        document.removeEventListener('pointerlockchange', onLockChange);
        reject(new Error('Pointer lock request timed out'));
      }, 1000);

      document.addEventListener('pointerlockchange', onLockChange);

      // Request pointer lock
      const promise = canvas.requestPointerLock();
      
      promise.then(() => {
        // Promise resolves immediately, but we wait for pointerlockchange event
        // to confirm it's actually locked
      }).catch((err) => {
        clearTimeout(timeout);
        document.removeEventListener('pointerlockchange', onLockChange);
        
        // Handle specific error types
        if (err.name === 'NotAllowedError') {
          console.warn('Pointer lock denied by user or browser policy');
        } else if (err.name === 'NotSupportedError') {
          console.warn('Pointer lock not supported');
        } else {
          console.warn('Pointer lock request failed:', err);
        }
        reject(err);
      });
    });
  }

  public releasePointerLock(): void {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  public isMouseButtonPressed(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  public getMouseDelta(): { x: number; y: number } {
    // Return and reset mouse delta
    const delta = { 
      x: this.mouseDeltaX || 0, 
      y: this.mouseDeltaY || 0 
    };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  public dispose(): void {
    // Event listeners will be cleaned up automatically
    this.keys.clear();
    this.mouseButtons.clear();
  }
}

