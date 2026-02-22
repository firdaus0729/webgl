import { GameScene } from './scene';
import { InputManager } from './input';
import { Player } from './player';
import { Bot } from './bot';
import { Weapon } from './weapon';
import { GAME_CONSTANTS } from './constants';

export type GameState = 'waiting' | 'playing' | 'respawning' | 'matchEnded' | 'paused';

export interface GameStats {
  playerKills: number;
  botKills: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  playerAccuracy: number;
  botAccuracy: number;
  averageLifeDuration: number;
}

export class GameManager {
  private scene: GameScene;
  private input: InputManager;
  private player: Player;
  private bot: Bot;
  private playerWeapon: Weapon;
  private botWeapon: Weapon;
  private state: GameState = 'waiting'; // Start in waiting state until user clicks start
  private matchStartTime: number = 0;
  private matchTimeRemaining: number = GAME_CONSTANTS.MATCH_TIME_LIMIT;
  private playerKills: number = 0;
  private botKills: number = 0;
  private respawnTimer: number = 0;
  private respawningEntity: 'player' | 'bot' | null = null;

  // Internal metrics
  private stats: GameStats = {
    playerKills: 0,
    botKills: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
    playerAccuracy: 0,
    botAccuracy: 0,
    averageLifeDuration: 0,
  };

  private lifeStartTime: number = 0;
  private gameStartTime: number = 0; // Track when game actually started (for grace period)
  private lifeDurations: number[] = [];
  private playerShotsFired: number = 0;
  private playerShotsHit: number = 0;
  private botShotsFired: number = 0;
  private botShotsHit: number = 0;

  // Callbacks
  private stateChangeCallbacks: ((state: GameState) => void)[] = [];
  private statsUpdateCallbacks: ((stats: Partial<GameStats>) => void)[] = [];
  private hitCallbacks: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new GameScene(canvas);
    this.input = new InputManager(canvas);
    this.playerWeapon = new Weapon(this.scene.scene);
    this.botWeapon = new Weapon(this.scene.scene);

    this.player = new Player(this.scene.camera, this.input, this.playerWeapon);
    this.bot = new Bot(this.scene.scene, this.scene.botSpawn, this.botWeapon);

    // Setup player health callbacks
    this.player.health.onDeath(() => {
      this.handlePlayerDeath();
    });

    // Setup bot health callbacks
    this.bot.health.onDeath(() => {
      this.handleBotDeath();
    });

    this.matchStartTime = Date.now();
    this.lifeStartTime = Date.now();

    // Start render loop
    this.scene.render();
    this.gameLoop();
  }

  public async startGame(): Promise<void> {
    // Only start game if we're in waiting state
    if (this.state !== 'waiting') {
      return; // Already started or in another state
    }

    try {
      // Request pointer lock first (requires user gesture)
      await this.input.requestPointerLock();
      
      // Only transition to playing state if pointer lock succeeded
      this.state = 'playing';
      this.matchStartTime = Date.now();
      this.lifeStartTime = Date.now();
      this.gameStartTime = Date.now(); // Track when game actually started
      this.notifyStateChange();
    } catch (error) {
      // Pointer lock failed - don't start the game
      console.warn('Failed to start game - pointer lock denied');
      // Keep state as 'waiting' so user can try again
    }
  }

  private gameLoop(): void {
    let lastTime = performance.now();
    
    const loop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap deltaTime
      lastTime = currentTime;
      const now = Date.now();

      // Handle pause/unpause with Esc key (only if game has started)
      if (this.input.isKeyPressed('escape')) {
        if (this.state === 'playing') {
          this.pause();
        } else if (this.state === 'paused') {
          this.unpause();
        }
      }

      // Only update game logic if playing (not waiting, paused, or respawning)
      if (this.state === 'playing') {
        // Update match timer
        const elapsed = (now - this.matchStartTime) / 1000;
        this.matchTimeRemaining = Math.max(0, GAME_CONSTANTS.MATCH_TIME_LIMIT - elapsed);

        // Check win conditions
        if (this.playerKills >= GAME_CONSTANTS.WIN_CONDITION_KILLS) {
          this.endMatch('player');
          return;
        }
        if (this.botKills >= GAME_CONSTANTS.WIN_CONDITION_KILLS) {
          this.endMatch('bot');
          return;
        }
        if (this.matchTimeRemaining <= 0) {
          this.endMatch(this.playerKills > this.botKills ? 'player' : this.botKills > this.playerKills ? 'bot' : 'tie');
          return;
        }

        // Update entities
        this.player.update(deltaTime);
        this.bot.update(deltaTime, this.player.getPosition());

        // Handle player shooting
        if (this.input.isMouseButtonPressed(0) && this.playerWeapon.canFire()) {
          this.playerShotsFired++;
          this.stats.shotsFired++;
          const forward = this.player.getForwardVector();
          void this.playerWeapon.fire(
            this.player.getPosition(),
            forward,
            this.bot,
            (isHeadshot) => {
              if (isHeadshot) {
                this.stats.headshots++;
              }
              this.playerShotsHit++;
              this.stats.shotsHit++;
              this.notifyHit();
            }
          );
        }

        // Handle bot shooting - add grace period of 2 seconds after game starts
        const timeSinceStart = (now - this.gameStartTime) / 1000;
        const gracePeriod = 2; // 2 seconds grace period
        
        if (this.botWeapon.canFire() && 
            !this.bot.health.isDead() && 
            !this.player.health.isDead() &&
            timeSinceStart >= gracePeriod) { // Don't shoot during grace period
          const distance = this.bot.getPosition().subtract(this.player.getPosition()).length();
          if (distance <= GAME_CONSTANTS.BOT_CHASE_DISTANCE) {
            this.botShotsFired++;
            const direction = this.bot.getShootDirection(this.player.getPosition());
            void this.botWeapon.fire(
              this.bot.getPosition(),
              direction,
              this.player,
              () => {
                this.botShotsHit++;
              }
            );
          }
        }

        // Update stats
        this.updateStats();
      } else if (this.state === 'paused') {
        // Game is paused - don't update anything
      } else if (this.state === 'respawning') {
        this.respawnTimer -= deltaTime;
        if (this.respawnTimer <= 0) {
          if (this.respawningEntity === 'player') {
            this.player.respawn(this.scene.playerSpawn);
            this.lifeStartTime = Date.now();
          } else if (this.respawningEntity === 'bot') {
            this.bot.respawn(this.scene.botSpawn);
          }
          this.state = 'playing';
          this.respawningEntity = null;
          this.notifyStateChange();
        }
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private handlePlayerDeath(): void {
    const lifeDuration = (Date.now() - this.lifeStartTime) / 1000;
    this.lifeDurations.push(lifeDuration);
    this.botKills++;
    this.stats.botKills = this.botKills;
    this.startRespawn('player');
  }

  private handleBotDeath(): void {
    this.playerKills++;
    this.stats.playerKills = this.playerKills;
    this.startRespawn('bot');
  }

  private startRespawn(entity: 'player' | 'bot'): void {
    this.state = 'respawning';
    this.respawningEntity = entity;
    this.respawnTimer = GAME_CONSTANTS.RESPAWN_DELAY;
    this.notifyStateChange();
  }

  private endMatch(_winner: 'player' | 'bot' | 'tie'): void {
    this.state = 'matchEnded';
    this.player.setCanControl(false);
    this.updateStats();
    this.notifyStateChange();
  }

  public getMatchWinner(): 'player' | 'bot' | 'tie' {
    if (this.playerKills > this.botKills) return 'player';
    if (this.botKills > this.playerKills) return 'bot';
    return 'tie';
  }

  private updateStats(): void {
    this.stats.playerAccuracy = this.playerShotsFired > 0 
      ? (this.playerShotsHit / this.playerShotsFired) * 100 
      : 0;
    
    this.stats.botAccuracy = this.botShotsFired > 0 
      ? (this.botShotsHit / this.botShotsFired) * 100 
      : 0;

    if (this.lifeDurations.length > 0) {
      const sum = this.lifeDurations.reduce((a, b) => a + b, 0);
      this.stats.averageLifeDuration = sum / this.lifeDurations.length;
    }

    this.notifyStatsUpdate();
  }

  public getState(): GameState {
    return this.state;
  }

  public getMatchTimeRemaining(): number {
    return this.matchTimeRemaining;
  }

  public getPlayerKills(): number {
    return this.playerKills;
  }

  public getBotKills(): number {
    return this.botKills;
  }

  public getPlayerHealth(): number {
    return this.player.health.getHealth();
  }

  public getBotHealth(): number {
    return this.bot.health.getHealth();
  }

  public getStats(): GameStats {
    return { ...this.stats };
  }

  public isPaused(): boolean {
    return this.state === 'paused';
  }

  private pause(): void {
    this.state = 'paused';
    this.player.setCanControl(false);
    this.input.releasePointerLock();
    this.notifyStateChange();
  }

  public async unpause(): Promise<void> {
    if (this.state === 'paused') {
      try {
        await this.input.requestPointerLock();
        this.state = 'playing';
        this.player.setCanControl(true);
        this.notifyStateChange();
      } catch (error) {
        console.warn('Failed to unpause - pointer lock denied');
        // Keep paused state if pointer lock fails
      }
    }
  }

  public onStateChange(callback: (state: GameState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  public onStatsUpdate(callback: (stats: Partial<GameStats>) => void): void {
    this.statsUpdateCallbacks.push(callback);
  }

  public onHit(callback: () => void): void {
    this.hitCallbacks.push(callback);
  }

  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(cb => cb(this.state));
  }

  private notifyStatsUpdate(): void {
    this.statsUpdateCallbacks.forEach(cb => cb(this.stats));
  }

  private notifyHit(): void {
    this.hitCallbacks.forEach(cb => cb());
  }

  public restart(): void {
    // Reset all state
    this.state = 'waiting'; // Reset to waiting state - user must click start again
    this.matchStartTime = Date.now();
    this.matchTimeRemaining = GAME_CONSTANTS.MATCH_TIME_LIMIT;
    this.playerKills = 0;
    this.botKills = 0;
    this.respawnTimer = 0;
    this.respawningEntity = null;

    // Reset stats
    this.stats = {
      playerKills: 0,
      botKills: 0,
      shotsFired: 0,
      shotsHit: 0,
      headshots: 0,
      playerAccuracy: 0,
      botAccuracy: 0,
      averageLifeDuration: 0,
    };

    this.lifeStartTime = Date.now();
    this.lifeDurations = [];
    this.playerShotsFired = 0;
    this.playerShotsHit = 0;
    this.botShotsFired = 0;
    this.botShotsHit = 0;

    // Respawn entities
    this.player.respawn(this.scene.playerSpawn);
    this.bot.respawn(this.scene.botSpawn);

    this.notifyStateChange();
    this.notifyStatsUpdate();
  }

  public dispose(): void {
    this.player.dispose();
    this.bot.dispose();
    this.input.dispose();
    this.scene.dispose();
  }
}

