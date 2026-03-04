// Game constants
export const GAME_CONSTANTS = {
  // Movement
  MOVE_SPEED: 6.5,
  JUMP_FORCE: 7.5,
  GRAVITY: -9.81,
  
  // Combat (melee / kickboxing)
  BODY_DAMAGE: 15,
  HEADSHOT_MULTIPLIER: 1.5,
  HEADSHOT_DAMAGE: 25,
  MELEE_RANGE: 2.2,
  MELEE_ATTACK_INTERVAL: 0.5, // seconds between punches/kicks
  
  // Health
  MAX_HEALTH: 100,
  RESPAWN_DELAY: 2, // seconds
  
  // Match
  WIN_CONDITION_KILLS: 10,
  MATCH_TIME_LIMIT: 5 * 60, // 5 minutes in seconds
  
  // Bot AI
  BOT_MELEE_RANGE: 2.2,
  BOT_CHASE_DISTANCE: 15,
  BOT_STRAFE_MIN: 4,
  BOT_STRAFE_MAX: 8,
  BOT_REACTION_DELAY: 400, // milliseconds between attacks
  BOT_ATTACK_CHANCE: 0.7, // chance to attack when in range
  
  // Arena
  ARENA_SIZE: 30,
  PLATFORM_HEIGHT: 3,
  PLATFORM_SIZE: 8,
} as const;

