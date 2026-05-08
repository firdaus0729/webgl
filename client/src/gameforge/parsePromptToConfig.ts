import type {
  Difficulty,
  EnemyDensity,
  EnemyType,
  GameConfig,
  GameType,
  LevelSize,
  PlatformDensity,
  Theme,
} from './GameConfig'

const normalize = (prompt: string) => prompt.trim().toLowerCase()

function pickOne<T extends string>(value: T | undefined, fallback: T): T {
  return value ?? fallback
}

function containsAny(text: string, needles: string[]) {
  return needles.some((n) => text.includes(n))
}

export function parsePromptToConfig(prompt: string): GameConfig {
  const text = normalize(prompt)

  // Defaults (CRITICAL).
  let gameType: GameType = 'platformer'
  let theme: Theme = 'cartoon'
  let difficulty: Difficulty = 'medium'
  let enemyType: EnemyType = 'drones'
  let enemyDensity: EnemyDensity = 'medium'
  let platformDensity: PlatformDensity = 'medium'
  let levelSize: LevelSize = 'medium'

  // gameType (must match `GameConfig` + Phaser scene routing)
  if (
    containsAny(text, [
      'boxing',
      '1v1',
      'one on one',
      'one-on-one',
      'ring fight',
      'punch',
      'knockout',
      'heavyweight',
      'middleweight',
      'sparring',
    ])
  ) {
    gameType = 'boxing_1v1'
  } else if (
    containsAny(text, [
      'top-down arena',
      'top down arena',
      'arena mode',
      'twin stick',
      'twin-stick',
      'survivor io',
      'survivor.io',
    ])
  ) {
    gameType = 'top_down_arena'
  } else if (
    containsAny(text, [
      'retro shooter',
      'vertical shooter',
      'shmup',
      'space shooter',
      'galaga',
      'gradius',
      'bullet hell',
      'shooter',
    ])
  ) {
    gameType = 'retro_shooter'
  }

  // theme
  if (
    containsAny(text, [
      'cyber',
      'neon',
      'synth',
      'chrome',
      'futur',
      'dystop',
      'robot',
      'machines',
      'mech',
    ])
  ) {
    theme = 'cyberpunk'
  } else if (containsAny(text, ['forest', 'jungle', 'trees', 'vines', 'wood'])) {
    theme = 'forest'
  } else if (containsAny(text, ['desert', 'sand', 'mirage', 'dune'])) {
    theme = 'desert'
  } else if (containsAny(text, ['cartoon', 'chibi', 'cute', 'kids', 'whimsical'])) {
    theme = 'cartoon'
  }

  // difficulty
  if (containsAny(text, ['hard', 'difficult', 'brutal', 'insane', 'expert', 'chaos'])) {
    difficulty = 'hard'
  } else if (containsAny(text, ['easy', 'simple', 'casual', 'relax', 'chill'])) {
    difficulty = 'easy'
  }

  // enemyType
  if (
    containsAny(text, ['alien', 'aliens', 'ufo', 'extraterrestrial', 'xeno'])
  ) {
    enemyType = 'aliens'
  } else if (
    containsAny(text, ['robot', 'android', 'mech', 'automation', 'automaton'])
  ) {
    enemyType = 'robots'
  } else if (containsAny(text, ['drone', 'drones', 'copter', 'quad'])) {
    enemyType = 'drones'
  }

  // enemyDensity
  if (
    containsAny(text, [
      'no enemies',
      'few enemies',
      'low enemies',
      'minimal enemies',
      'light enemies',
      'not many enemies',
      'easy mode',
    ])
  ) {
    enemyDensity = 'low'
  } else if (
    containsAny(text, [
      'many enemies',
      'lots of enemies',
      'lots enemies',
      'many foes',
      'horde',
      'swarm',
      'chaos',
      'overwhelming',
    ])
  ) {
    enemyDensity = 'high'
  }

  // platformDensity
  if (
    containsAny(text, [
      'few platforms',
      'low platforms',
      'sparse platforms',
      'simple level',
      'less platforms',
    ])
  ) {
    platformDensity = 'low'
  } else if (
    containsAny(text, [
      'many platforms',
      'lots of platforms',
      'dense platforms',
      'platforms everywhere',
      'lots platforms',
      'more platforms',
    ])
  ) {
    platformDensity = 'high'
  }

  // levelSize
  if (containsAny(text, ['small', 'short', 'compact'])) {
    levelSize = 'small'
  } else if (containsAny(text, ['large', 'big', 'huge', 'long'])) {
    levelSize = 'large'
  }

  // Enforce fallbacks (never undefined).
  return {
    gameType: pickOne(gameType, 'platformer'),
    theme: pickOne(theme, 'cartoon'),
    difficulty: pickOne(difficulty, 'medium'),
    enemyType: pickOne(enemyType, 'drones'),
    enemyDensity: pickOne(enemyDensity, 'medium'),
    platformDensity: pickOne(platformDensity, 'medium'),
    levelSize: pickOne(levelSize, 'medium'),
  }
}

