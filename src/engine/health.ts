import { GAME_CONSTANTS } from './constants';

export interface IHealth {
  getHealth(): number;
  getMaxHealth(): number;
  takeDamage(amount: number, isHeadshot: boolean): void;
  isDead(): boolean;
  reset(): void;
  onDeath(callback: () => void): void;
  onHealthChange(callback: (health: number) => void): void;
}

export class Health implements IHealth {
  private health: number;
  private maxHealth: number;
  private deathCallbacks: (() => void)[] = [];
  private healthChangeCallbacks: ((health: number) => void)[] = [];

  constructor(maxHealth: number = GAME_CONSTANTS.MAX_HEALTH) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  public getHealth(): number {
    return this.health;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public takeDamage(amount: number, _isHeadshot: boolean = false): void {
    if (this.health <= 0) return;

    this.health = Math.max(0, this.health - amount);
    this.notifyHealthChange();

    if (this.health <= 0) {
      this.notifyDeath();
    }
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public reset(): void {
    this.health = this.maxHealth;
    this.notifyHealthChange();
  }

  public onDeath(callback: () => void): void {
    this.deathCallbacks.push(callback);
  }

  public onHealthChange(callback: (health: number) => void): void {
    this.healthChangeCallbacks.push(callback);
  }

  private notifyDeath(): void {
    this.deathCallbacks.forEach(cb => cb());
  }

  private notifyHealthChange(): void {
    this.healthChangeCallbacks.forEach(cb => cb(this.health));
  }
}

