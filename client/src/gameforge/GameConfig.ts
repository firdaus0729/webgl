export type GameType = 'platformer' | 'shooter'
export type Theme = 'cyberpunk' | 'forest' | 'desert' | 'cartoon'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type EnemyType = 'drones' | 'aliens' | 'robots'
export type EnemyDensity = 'low' | 'medium' | 'high'
export type PlatformDensity = 'low' | 'medium' | 'high'
export type LevelSize = 'small' | 'medium' | 'large'

export type GameConfig = {
  gameType: GameType
  theme: Theme
  difficulty: Difficulty
  enemyType: EnemyType
  enemyDensity: EnemyDensity
  platformDensity: PlatformDensity
  levelSize: LevelSize
}

