export type BoxingWinner = 'player' | 'opponent' | 'draw';
export type BoxingRoundEndReason = 'ko' | 'time';

export interface BoxingRoundResult {
  winner: BoxingWinner;
  round: number;
  score: { player: number; opponent: number };
  isMatchOver: boolean;
  targetWins: number;
  reason: BoxingRoundEndReason;
}

const COUNTDOWN_SECONDS = 3;
const TARGET_WINS = 2;
const MAX_ROUNDS = 3;

type MatchState = {
  round: number;
  score: { player: number; opponent: number };
  roundStartedAt: number;
  roundEnded: boolean;
  lastResult: BoxingRoundResult | null;
};

let state: MatchState = {
  round: 1,
  score: { player: 0, opponent: 0 },
  roundStartedAt: 0,
  roundEnded: false,
  lastResult: null,
};

function nowSeconds(): number {
  return performance.now() / 1000;
}

export function resetBoxingMatch(): void {
  state = {
    round: 1,
    score: { player: 0, opponent: 0 },
    roundStartedAt: 0,
    roundEnded: false,
    lastResult: null,
  };
}

export function startBoxingRound(): void {
  state.roundStartedAt = nowSeconds();
  state.roundEnded = false;
  state.lastResult = null;
}

export function getBoxingCountdownRemaining(): number {
  if (state.roundStartedAt <= 0) return COUNTDOWN_SECONDS;
  const elapsed = nowSeconds() - state.roundStartedAt;
  return Math.max(0, COUNTDOWN_SECONDS - elapsed);
}

export function getBoxingFightElapsed(): number {
  if (state.roundStartedAt <= 0) return 0;
  const elapsed = nowSeconds() - state.roundStartedAt;
  return Math.max(0, elapsed - COUNTDOWN_SECONDS);
}

export function isBoxingFrozen(): boolean {
  return getBoxingCountdownRemaining() > 0;
}

export function getBoxingRoundInfo(): { round: number; score: { player: number; opponent: number }; targetWins: number } {
  return { round: state.round, score: { ...state.score }, targetWins: TARGET_WINS };
}

export function getLastBoxingRoundResult(): BoxingRoundResult | null {
  return state.lastResult;
}

export function recordBoxingRoundEnd(winner: BoxingWinner, reason: BoxingRoundEndReason): BoxingRoundResult | null {
  if (state.roundEnded) return null;
  state.roundEnded = true;

  if (winner === 'player') state.score.player += 1;
  else if (winner === 'opponent') state.score.opponent += 1;

  const isMatchOver =
    state.score.player >= TARGET_WINS ||
    state.score.opponent >= TARGET_WINS ||
    state.round >= MAX_ROUNDS;

  const result: BoxingRoundResult = {
    winner,
    round: state.round,
    score: { ...state.score },
    isMatchOver,
    targetWins: TARGET_WINS,
    reason,
  };
  state.lastResult = result;
  return result;
}

export function advanceToNextBoxingRound(): void {
  // If match is over, don't advance
  if (state.score.player >= TARGET_WINS || state.score.opponent >= TARGET_WINS || state.round >= MAX_ROUNDS) return;
  state.round += 1;
  startBoxingRound();
}

