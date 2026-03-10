import { useEffect, useRef, useState } from 'react';
import { Engine2D } from '../core2d/Engine2D';
import { boxingMode } from '../modes/boxing/boxingMode';
import { platformerMode } from '../modes/platformer/platformerMode';
import { arenaMode } from '../modes/topdownArena/arenaMode';
import { runnerMode } from '../modes/endlessRunner/runnerMode';
import { gridMode } from '../modes/gridBoard/gridMode';
import type { GameModeConfig } from '../core2d/GameModeConfig';
import type { GameModeId } from '../core2d/Types';
import { HUD2D } from './HUD2D';
import './CanvasGameView.css';
import { advanceToNextBoxingRound, resetBoxingMatch } from '../modes/boxing/boxingMatchState';

const MODE_MAP: Partial<Record<GameModeId, typeof boxingMode>> = {
  boxing: boxingMode,
  platformer: platformerMode as typeof boxingMode,
  topdown_arena: arenaMode as typeof boxingMode,
  endless_runner: runnerMode as typeof boxingMode,
  grid_board: gridMode as typeof boxingMode,
};

const CONTROLS_HINT: Record<GameModeId, string> = {
  boxing: 'A/D left/right · W/S forward/back · Move inside the ring · J jab, K strong · L block',
  platformer: 'A / D move · Space or W jump · Stomp enemies',
  topdown_arena: 'W A S D move · Space or click shoot',
  endless_runner: 'A / D switch lanes',
  grid_board: 'A / D select column · Enter drop',
};

interface CanvasGameViewProps {
  config: GameModeConfig;
  template: GameModeId;
  onBack: () => void;
}

type BoxingRoundResult = {
  kind: 'boxing_round';
  winner: 'player' | 'opponent' | 'draw';
  round: number;
  score: { player: number; opponent: number };
  targetWins: number;
  isMatchOver: boolean;
  reason?: 'ko' | 'time';
};
type LevelCompleteResult = {
  kind: 'level_complete';
  score: number;
  starsEarned?: number;
  enemiesKilled?: number;
  totalScore?: number;
};
type GameResult =
  | BoxingRoundResult
  | LevelCompleteResult
  | { kind: 'generic'; playerWon: boolean; isDraw?: boolean }
  | null;

export function CanvasGameView({ config, template, onBack }: CanvasGameViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine2D | null>(null);
  const [engine, setEngine] = useState<Engine2D | null>(null);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [countdownText, setCountdownText] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const mode = MODE_MAP[template];
    if (!container || !mode) return;

    if (template === 'boxing') {
      resetBoxingMatch();
    }

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const resize = () => {
      canvas.width = container!.clientWidth;
      canvas.height = container!.clientHeight;
    };
    window.addEventListener('resize', resize);

    const eng = new Engine2D({
      canvas,
      mode,
      config,
    });
    engineRef.current = eng;
    setEngine(eng);

    const unsubDie = eng.getEvents().subscribe('entity_died', (e) => {
      if (e.type !== 'entity_died') return;
      if (template === 'boxing') return;
      const world = eng.getWorld();
      const tag = world.getComponent(e.entity, 'tag');
      const playerWon = tag?.value === 'opponent';
      setGameResult({ kind: 'generic', playerWon });
      eng.stop();
    });

    const unsubRound = eng.getEvents().subscribe('round_ended', (e) => {
      if (e.type !== 'round_ended') return;
      if (template === 'boxing') {
        setGameResult({
          kind: 'boxing_round',
          winner: e.winner ?? 'draw',
          round: e.round ?? 1,
          score: e.score ?? { player: 0, opponent: 0 },
          targetWins: e.targetWins ?? 2,
          isMatchOver: e.isMatchOver ?? true,
          reason: e.reason,
        });
      } else {
        const isDraw = e.winner === 'draw';
        const playerWon = e.winner === 'player';
        setGameResult({ kind: 'generic', playerWon, isDraw });
      }
      eng.stop();
    });

    const unsubLevelComplete = eng.getEvents().subscribe('level_complete', (e) => {
      if (e.type !== 'level_complete') return;
      if (template === 'platformer') {
        setGameResult({
          kind: 'level_complete',
          score: e.score ?? 0,
          starsEarned: e.starsEarned ?? 0,
          enemiesKilled: e.enemiesKilled ?? 0,
          totalScore: e.totalScore ?? e.score ?? 0,
        });
        eng.stop();
      }
    });

    eng.start();

    return () => {
      unsubDie();
      unsubRound();
      unsubLevelComplete();
      eng.dispose();
      engineRef.current = null;
      setEngine(null);
      setGameResult(null);
      setCountdownText(null);
      window.removeEventListener('resize', resize);
      container.removeChild(canvas);
    };
  }, [template, config.camera.mode]);

  useEffect(() => {
    if (!engine || template !== 'boxing') return;
    const services = engine.getServices();
    let lastCeil = 0;
    let startTimeout: number | null = null;

    const tick = () => {
      const rem = services.getCountdownRemaining?.() ?? 0;
      if (rem > 0) {
        const ceil = Math.ceil(rem);
        lastCeil = ceil;
        setCountdownText(String(ceil));
      } else if (lastCeil > 0) {
        lastCeil = 0;
        setCountdownText('START');
        if (startTimeout) window.clearTimeout(startTimeout);
        startTimeout = window.setTimeout(() => setCountdownText(null), 600);
      }
    };

    tick();
    const id = window.setInterval(tick, 50);
    return () => {
      window.clearInterval(id);
      if (startTimeout) window.clearTimeout(startTimeout);
    };
  }, [engine, template]);

  const handleRestart = () => {
    setGameResult(null);
    if (template === 'boxing') resetBoxingMatch();
    engineRef.current?.restart();
  };

  const handleNextRound = () => {
    setGameResult(null);
    advanceToNextBoxingRound();
    engineRef.current?.restart();
  };

  const showHUD = template === 'boxing' || template === 'platformer' || template === 'topdown_arena';

  return (
    <div className="canvas-game-view">
      <div ref={containerRef} className="canvas-game-view-canvas-wrap" />
      {template === 'boxing' && countdownText && (
        <div className="canvas-game-view-countdown" aria-live="polite">
          {countdownText}
        </div>
      )}
      <div className="canvas-game-view-controls-hint">{CONTROLS_HINT[template]}</div>
      {engine && showHUD && <HUD2D engine={engine} />}
      <button type="button" className="canvas-game-view-back" onClick={onBack}>
        Back to menu
      </button>
      {gameResult && (
        <div className="canvas-game-view-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
          <div
            className={`canvas-game-view-result-modal canvas-game-view-result-modal--${
              gameResult.kind === 'level_complete'
                ? 'win'
                : gameResult.kind === 'boxing_round'
                  ? gameResult.winner === 'draw'
                    ? 'draw'
                    : gameResult.winner === 'player'
                      ? 'win'
                      : 'lose'
                  : gameResult.kind === 'generic' && gameResult.isDraw
                    ? 'draw'
                    : gameResult.kind === 'generic' && gameResult.playerWon
                      ? 'win'
                      : gameResult.kind === 'generic'
                        ? 'lose'
                        : 'win'
            }`}
          >
            <h2 id="game-result-title" className="canvas-game-view-result-title">
              {gameResult.kind === 'level_complete'
                ? 'Level Complete'
                : gameResult.kind === 'boxing_round'
                  ? `Round ${gameResult.round} ${
                      gameResult.winner === 'draw' ? 'Draw' : gameResult.winner === 'player' ? 'Win' : 'Loss'
                    }`
                  : gameResult.kind === 'generic' && gameResult.isDraw
                    ? 'Draw'
                    : gameResult.kind === 'generic' && gameResult.playerWon
                      ? 'Victory'
                      : 'Defeat'}
            </h2>
            <p className="canvas-game-view-result-subtitle">
              {gameResult.kind === 'level_complete' ? (
                <>
                  <span className="canvas-game-view-result-stat">Score: {gameResult.totalScore ?? gameResult.score}</span>
                  {typeof gameResult.starsEarned === 'number' && (
                    <span className="canvas-game-view-result-stat">Stars: {gameResult.starsEarned}</span>
                  )}
                  {typeof gameResult.enemiesKilled === 'number' && (
                    <span className="canvas-game-view-result-stat">Enemies defeated: {gameResult.enemiesKilled}</span>
                  )}
                </>
              ) : gameResult.kind === 'boxing_round' ? (
                <>
                  <span>
                    Score: You {gameResult.score.player} – {gameResult.score.opponent} Opponent (first to {gameResult.targetWins})
                  </span>
                  <br />
                  <span>{gameResult.reason === 'ko' ? 'Knockout!' : gameResult.reason === 'time' ? "Time's up." : ''}</span>
                </>
              ) : gameResult.kind === 'generic' && gameResult.isDraw ? (
                'No winner this round.'
              ) : gameResult.kind === 'generic' && gameResult.playerWon ? (
                'You won the match!'
              ) : (
                'The opponent won the match.'
              )}
            </p>
            <div className="canvas-game-view-result-actions">
              {gameResult.kind === 'boxing_round' && !gameResult.isMatchOver ? (
                <button
                  type="button"
                  className="canvas-game-view-result-btn canvas-game-view-result-btn-primary"
                  onClick={handleNextRound}
                >
                  Next round
                </button>
              ) : (
                <button type="button" className="canvas-game-view-result-btn canvas-game-view-result-btn-primary" onClick={handleRestart}>
                  Restart
                </button>
              )}
              <button type="button" className="canvas-game-view-result-btn canvas-game-view-result-btn-secondary" onClick={onBack}>
                Back to menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
