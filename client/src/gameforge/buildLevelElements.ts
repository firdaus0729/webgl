import type { GameConfig } from './GameConfig'
import type {
  LevelElement,
  LevelElementsConfig,
  QuestionBlockReward,
} from './config'
import { floatBetween, intBetween, rngFromString } from './sessionSeed'

const REWARD_POOL: QuestionBlockReward[] = [
  'coin',
  'coin',
  'coin',
  'coin',
  'mushroom',
  'flower',
  'star',
  '1up',
]

function questionCount(game: GameConfig): number {
  if (game.levelSize === 'small') return 4
  if (game.levelSize === 'large') return 10
  return 7
}

function pipeCount(game: GameConfig): number {
  if (game.levelSize === 'small') return 1
  if (game.levelSize === 'large') return 3
  return 2
}

export function generateLevelElements(
  game: GameConfig,
  sessionSeed: string,
): LevelElementsConfig {
  const rng = rngFromString(`${sessionSeed}|levelEl`)
  const elements: LevelElement[] = []

  const checkpoints =
    game.levelSize === 'small' ? [0.45] : game.levelSize === 'large' ? [0.28, 0.52, 0.78] : [0.38, 0.72]

  for (const xRatio of checkpoints) {
    elements.push({
      type: 'checkpoint',
      xRatio: Math.min(0.88, Math.max(0.12, xRatio + (rng() - 0.5) * 0.04)),
    })
  }

  const pipes = pipeCount(game)
  for (let i = 0; i < pipes; i++) {
    const base = 0.22 + (i + 1) / (pipes + 1) * 0.55
    const entry = base + floatBetween(rng, -0.04, 0.04)
    const exit = Math.min(0.9, entry + floatBetween(rng, 0.18, 0.28))
    elements.push({
      type: 'pipe',
      xRatio: entry,
      heightRatio: floatBetween(rng, 0.14, 0.22),
      warpToXRatio: exit,
    })
    elements.push({
      type: 'pipe',
      xRatio: exit,
      heightRatio: floatBetween(rng, 0.12, 0.18),
      warpToXRatio: entry,
    })
  }

  const qN = questionCount(game)
  for (let i = 0; i < qN; i++) {
    const xRatio = Math.min(
      0.92,
      Math.max(0.08, 0.1 + (i / Math.max(1, qN - 1)) * 0.82 + (rng() - 0.5) * 0.05),
    )
    const yAboveGroundRatio = floatBetween(rng, 0.1, 0.38)
    const reward = REWARD_POOL[intBetween(rng, 0, REWARD_POOL.length - 1)]
    elements.push({ type: 'question', xRatio, yAboveGroundRatio, reward })
  }

  elements.sort((a, b) => {
    const ax = a.type === 'question' ? a.xRatio : a.xRatio
    const bx = b.type === 'question' ? b.xRatio : b.xRatio
    return ax - bx
  })

  return { elements }
}
