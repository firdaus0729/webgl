// Game constants
export const GAME_CONSTANTS = {
  // Movement
  MOVE_SPEED: 6.5,
  JUMP_FORCE: 7.5,
  GRAVITY: -9.81,
  
  // Combat
  BODY_DAMAGE: 20,
  HEADSHOT_MULTIPLIER: 1.5,
  HEADSHOT_DAMAGE: 30,
  FIRE_RATE: 5, // shots per second
  FIRE_INTERVAL: 0.2, // seconds
  
  // Health
  MAX_HEALTH: 100,
  RESPAWN_DELAY: 2, // seconds
  
  // Match
  WIN_CONDITION_KILLS: 10,
  MATCH_TIME_LIMIT: 5 * 60, // 5 minutes in seconds
  
  // Bot AI
  BOT_CHASE_DISTANCE: 20,
  BOT_STRAFE_MIN: 6,
  BOT_STRAFE_MAX: 10,
  BOT_REACTION_DELAY: 250, // milliseconds
  BOT_ACCURACY: 0.4, // 40%
  
  // Arena
  ARENA_SIZE: 30,
  PLATFORM_HEIGHT: 3,
  PLATFORM_SIZE: 8,
} as const;

